import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat";
import { keys } from "@/hooks/shared";
import { useRealtimeStore, useSocketEvent } from "@/realtime/socket";
import { useSessionStore } from "@/stores/session";
import { toApiError } from "@/lib/errors";
import type { ChatAttachment, ChatMessage, Person, ReceiptSummary, UnreadSummary } from "@/types/api";

const TYPING_TTL_MS = 4000;
const MAX_ITEMS = 400;

export type ChatTarget = { kind: "general" } | { kind: "private"; userId: number };

/** Elemento de la lista: un mensaje o un aviso del sistema (entró / salió) en el canal general. */
export type ChatItem =
  | (ChatMessage & { type: "message" })
  | { type: "system"; id: string; action: "joined" | "left"; person: Pick<Person, "id" | "name">; createdAt: string };
export type MessageItem = Extract<ChatItem, { type: "message" }>;

/** Lo que la persona redacta: texto, cita, adjunto o nota de voz, o respuesta dentro de un hilo. */
export type Draft = { content: string; replyTo?: ChatMessage | null; attachment?: ChatAttachment | null; threadRootId?: number | null };

type TypingEvent = { from: Person; recipientId: number | null; typing: boolean };
type ReadEvent = { readerId: number; scope: "general" | number; otherId?: number; at: string };
type ReceiptsEvent = { updates: { messageId: number; total: number; delivered: number; read: number }[] };
type Ack = { ok: true; message: ChatMessage } | { ok: false; error: string };

const ERROR_TEXT: Record<string, string> = {
  "400": "El mensaje está vacío, es demasiado largo o el adjunto no es válido.",
  "603": "Esa persona ya no está disponible.",
  "609": "Ese mensaje ya no está disponible.",
  "640": "Va muy rápido: espere unos segundos antes de enviar otro mensaje.",
};

const asItem = (m: ChatMessage): MessageItem => ({ ...m, type: "message" as const });
const byDate = (a: ChatItem, b: ChatItem) => a.createdAt.localeCompare(b.createdAt) || String(a.id).localeCompare(String(b.id));

/** Une un mensaje nuevo con el que ya había (mismo id o mismo clientId): nunca duplica y conserva los recibos propios. */
export const mergeMessage = (items: ChatItem[], m: ChatMessage): ChatItem[] => {
  const same = (x: ChatItem) => x.type === "message" && (x.id === m.id || (!!m.clientId && x.clientId === m.clientId));
  const first = items.findIndex(same);
  if (first === -1) return [...items, asItem(m)].sort(byDate).slice(-MAX_ITEMS);
  const prev = items[first] as MessageItem;
  const merged: MessageItem = { ...prev, ...m, clientId: m.clientId ?? prev.clientId, receipts: m.receipts ?? prev.receipts, replyCount: Math.max(m.replyCount, prev.replyCount), type: "message" as const };
  delete merged.pending;
  // Cualquier otra copia del mismo envío (provisional o llegada por el evento) se descarta.
  return items.flatMap((x, i) => (i === first ? [merged] : same(x) ? [] : [x])).sort(byDate);
};

/** Suma una respuesta de hilo al contador de su mensaje raíz. */
const bumpThread = (items: ChatItem[], rootId: number): ChatItem[] => items.map((x) => (x.type === "message" && x.id === rootId ? { ...x, replyCount: x.replyCount + 1 } : x));

/**
 * Estado de una conversación en tiempo real: historial por REST con «cargar anteriores», mensajes por socket
 * sin duplicados (id y clientId), envío optimista con reintento, chulitos de enviado/entregado/visto,
 * fijados, «está escribiendo…» y respaldo REST si el socket no está conectado.
 */
export const useConversation = (target: ChatTarget) => {
  const socket = useRealtimeStore((s) => s.socket);
  const status = useRealtimeStore((s) => s.status);
  const me = useSessionStore((s) => s.user?.id ?? 0);
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typing, setTyping] = useState<Record<number, Person>>({});
  const [firstUnreadId, setFirstUnreadId] = useState<number | null>(null);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const lastPing = useRef(0);
  const stopPing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const otherId = target.kind === "private" ? target.userId : null;
  const key = otherId === null ? "general" : `private:${otherId}`;

  const belongs = useCallback(
    (m: ChatMessage) =>
      otherId === null ? m.recipientId === null : (m.sender.id === otherId && m.recipientId === me) || (m.sender.id === me && m.recipientId === otherId),
    [otherId, me],
  );

  const fetchPage = useCallback(
    (before?: string) => (otherId === null ? chatService.general({ before, limit: 40 }) : chatService.private(otherId, { before, limit: 40 })),
    [otherId],
  );

  const refreshCounters = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...keys.chat, "conversations"] });
    void queryClient.invalidateQueries({ queryKey: [...keys.chat, "unread"] });
  }, [queryClient]);

  /** Avisa que se vio la conversación (genera los ✓✓ azules del autor). */
  const markRead = useCallback(() => {
    if (document.hidden) return;
    const body = otherId === null ? { scope: "general" } : { userId: otherId };
    if (socket?.connected) socket.emit("chat:leido", body);
    else void (otherId === null ? chatService.markGeneralRead() : chatService.markRead(otherId)).then(refreshCounters, () => undefined);
  }, [otherId, socket, refreshCounters]);

  useEffect(() => {
    setItems([]);
    setTyping({});
    setFirstUnreadId(null);
  }, [key]);

  // Historial inicial; se vuelve a pedir al reconectar para no perder lo que llegó durante la caída.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const unreadBefore = queryClient.getQueryData<UnreadSummary>([...keys.chat, "unread"]);
    fetchPage()
      .then((page) => {
        if (!alive) return;
        setItems((prev) => {
          const keep = prev.filter((x) => (x.type === "system" && otherId === null) || (x.type === "message" && x.pending !== undefined));
          const fromServer = page.messages.map(asItem);
          const merged = [...fromServer, ...keep.filter((k) => k.type === "system" || !fromServer.some((m) => m.id === k.id || (k.type === "message" && m.clientId !== undefined && m.clientId === k.clientId)))];
          return merged.sort(byDate);
        });
        setHasMore(page.hasMore);
        setFirstUnreadId((cur) => {
          if (cur !== null) return cur;
          const others = page.messages.filter((m) => m.sender.id !== me && m.threadRootId === null);
          if (otherId !== null) return others.find((m) => m.readAt === null)?.id ?? null;
          const n = unreadBefore?.general ?? 0;
          return n > 0 ? (others.at(-Math.min(n, others.length))?.id ?? null) : null;
        });
        markRead();
      })
      .catch((err: unknown) => alive && setError(toApiError(err).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, status === "online"]);

  // Al volver a la pestaña se marca como visto lo que llegó mientras estaba oculta.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) markRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  const clearTyping = useCallback((uid: number) => {
    clearTimeout(timers.current[uid]);
    setTyping((t) => {
      if (!(uid in t)) return t;
      const next = { ...t };
      delete next[uid];
      return next;
    });
  }, []);

  // Una respuesta de hilo se cuenta una sola vez aunque llegue por el ack y por el evento.
  const countedReplies = useRef(new Set<number>());
  const countReply = useCallback((m: ChatMessage) => {
    if (m.threadRootId === null || countedReplies.current.has(m.id)) return;
    countedReplies.current.add(m.id);
    setItems((prev) => bumpThread(prev, m.threadRootId as number));
  }, []);

  const receive = useCallback(
    (m: ChatMessage) => {
      if (!belongs(m)) return;
      if (m.threadRootId !== null) {
        // Las respuestas de hilo no entran al canal: solo suben el contador del mensaje raíz.
        countReply(m);
        return;
      }
      setItems((prev) => mergeMessage(prev, m));
    },
    [belongs, countReply],
  );

  useSocketEvent<ChatMessage>(otherId === null ? "chat:mensaje" : "chat:privado", (m) => {
    if (!belongs(m)) return;
    clearTyping(m.sender.id);
    receive(m);
    if (m.sender.id !== me) markRead();
  });

  useSocketEvent<ChatMessage>("chat:fijado", (m) => {
    if (belongs(m)) setItems((prev) => mergeMessage(prev, m));
    void queryClient.invalidateQueries({ queryKey: [...keys.chat, "pinned"] });
  });

  // Chulitos: el servidor avisa al autor cuántos recibieron y cuántos vieron.
  useSocketEvent<ReceiptsEvent>("chat:recibos", ({ updates }) => {
    const map = new Map<number, ReceiptSummary>(updates.map((u) => [u.messageId, { total: u.total, delivered: u.delivered, read: u.read }]));
    setItems((prev) => prev.map((x) => (x.type === "message" && map.has(x.id) ? { ...x, receipts: map.get(x.id) ?? x.receipts } : x)));
  });

  useSocketEvent<TypingEvent>("chat:escribiendo", (e) => {
    const match = otherId === null ? e.recipientId === null : e.recipientId === me && e.from.id === otherId;
    if (!match) return;
    if (!e.typing) return clearTyping(e.from.id);
    clearTimeout(timers.current[e.from.id]);
    timers.current[e.from.id] = setTimeout(() => clearTyping(e.from.id), TYPING_TTL_MS);
    return setTyping((t) => ({ ...t, [e.from.id]: e.from }));
  });

  useSocketEvent<ReadEvent>("chat:leido", (e) => {
    if (e.readerId === me) refreshCounters();
    if (otherId === null || e.readerId !== otherId) return;
    setItems((prev) => prev.map((x) => (x.type === "message" && x.sender.id === me && x.readAt === null ? { ...x, readAt: e.at } : x)));
  });

  useSocketEvent<Person>("usuario:conectado", (p) => {
    if (otherId !== null || p.id === me) return;
    setItems((prev) => [...prev, { type: "system" as const, id: `in-${p.id}-${Date.now()}`, action: "joined" as const, person: p, createdAt: new Date().toISOString() }].slice(-MAX_ITEMS));
  });
  useSocketEvent<{ id: number }>("usuario:desconectado", ({ id }) => {
    clearTyping(id);
    if (otherId !== null || id === me) return;
    const person = useRealtimeStore.getState().online.find((p) => p.id === id);
    setItems((prev) => [...prev, { type: "system" as const, id: `out-${id}-${Date.now()}`, action: "left" as const, person: { id, name: person?.name ?? "Un compañero" }, createdAt: new Date().toISOString() }].slice(-MAX_ITEMS));
  });

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  const loadOlder = useCallback(async (): Promise<boolean> => {
    const first = items.find((x) => x.type === "message");
    if (!first || loadingMore) return false;
    setLoadingMore(true);
    try {
      const page = await fetchPage(first.createdAt);
      setItems((prev) => [...page.messages.filter((m) => !prev.some((x) => x.type === "message" && x.id === m.id)).map(asItem), ...prev]);
      setHasMore(page.hasMore);
      return page.hasMore;
    } finally {
      setLoadingMore(false);
    }
  }, [items, loadingMore, fetchPage]);

  const typingPayload = useCallback((value: boolean) => ({ recipientId: otherId, typing: value }), [otherId]);

  /** Envía por socket (con ack) o por REST si no hay conexión; el clientId evita duplicados al reintentar. */
  const transmit = useCallback(
    async (clientId: string, d: Draft, recipientId: number | null): Promise<ChatMessage> => {
      const body = {
        ...(d.content.trim() ? { content: d.content.trim() } : {}),
        ...(d.replyTo ? { replyToId: d.replyTo.id } : {}),
        ...(d.threadRootId ? { threadRootId: d.threadRootId } : {}),
        ...(d.attachment ? { attachmentId: d.attachment.id } : {}),
        clientId,
      };
      if (socket?.connected) {
        socket.emit("chat:escribiendo", { recipientId, typing: false });
        const ack = (await socket.timeout(8000).emitWithAck(recipientId === null ? "chat:mensaje" : "chat:privado", recipientId === null ? body : { ...body, recipientId })) as Ack;
        if (!ack.ok) throw new Error(ERROR_TEXT[ack.error] ?? "No se pudo enviar el mensaje.");
        return ack.message;
      }
      try {
        return await chatService.send({ ...body, recipientId });
      } catch (err) {
        throw new Error(toApiError(err).message);
      }
    },
    [socket],
  );

  /** Envío optimista: el mensaje aparece al instante con un reloj y se confirma (o falla con «Reintentar»). */
  const send = useCallback(
    async (d: Draft, existingClientId?: string): Promise<ChatMessage> => {
      clearTimeout(stopPing.current);
      lastPing.current = 0;
      const clientId = existingClientId ?? crypto.randomUUID();
      const user = useSessionStore.getState().user;
      const placeholder: MessageItem | null =
        user && !d.threadRootId
          ? {
              type: "message",
              id: -Date.now(),
              clientId,
              sender: { id: user.id, name: `${user.firstName} ${user.lastName}`, username: user.username, role: user.role },
              recipientId: otherId,
              content: d.content.trim(),
              kind: d.attachment ? (d.attachment.mimeType.startsWith("audio/") ? "AUDIO" : "FILE") : "TEXT",
              readAt: null,
              createdAt: new Date().toISOString(),
              replyTo: d.replyTo ? { id: d.replyTo.id, senderName: d.replyTo.sender.name, preview: d.replyTo.content.slice(0, 140), kind: d.replyTo.kind } : null,
              threadRootId: null,
              replyCount: 0,
              pinnedAt: null,
              pinnedBy: null,
              mentions: [],
              attachment: d.attachment ?? null,
              receipts: null,
              pending: "sending",
            }
          : null;
      if (placeholder) setItems((prev) => (prev.some((x) => x.type === "message" && x.clientId === clientId) ? prev.map((x) => (x.type === "message" && x.clientId === clientId ? { ...x, pending: "sending" as const } : x)) : [...prev, placeholder]));
      try {
        const saved = await transmit(clientId, d, otherId);
        if (saved.threadRootId !== null) countReply(saved);
        else setItems((prev) => mergeMessage(prev, { ...saved, clientId }));
        return saved;
      } catch (err) {
        setItems((prev) => prev.map((x) => (x.type === "message" && x.clientId === clientId ? { ...x, pending: "failed" as const } : x)));
        throw err;
      }
    },
    [transmit, otherId, countReply],
  );

  /** Reintenta un mensaje que falló reutilizando su clientId (el servidor no lo duplica si ya había llegado). */
  const retry = useCallback(
    (m: MessageItem) => {
      if (!m.clientId) return Promise.resolve();
      return send({ content: m.content, replyTo: null, attachment: m.attachment }, m.clientId).then(() => undefined, () => undefined);
    },
    [send],
  );

  const discard = useCallback((clientId: string) => setItems((prev) => prev.filter((x) => !(x.type === "message" && x.clientId === clientId))), []);

  const pin = useCallback(async (m: ChatMessage, pinned: boolean) => {
    const saved = socket?.connected
      ? await (async () => {
          const ack = (await socket.timeout(6000).emitWithAck("chat:fijar", { messageId: m.id, pinned })) as Ack;
          if (!ack.ok) throw new Error(ack.error === "613" ? "Solo la administración puede fijar mensajes en el canal general." : (ERROR_TEXT[ack.error] ?? "No se pudo fijar."));
          return ack.message;
        })()
      : await chatService.pin(m.id, pinned);
    setItems((prev) => mergeMessage(prev, saved));
    void queryClient.invalidateQueries({ queryKey: [...keys.chat, "pinned"] });
  }, [socket, queryClient]);

  const notifyTyping = useCallback(() => {
    if (!socket?.connected) return;
    const now = Date.now();
    if (now - lastPing.current > 2000) {
      socket.emit("chat:escribiendo", typingPayload(true));
      lastPing.current = now;
    }
    clearTimeout(stopPing.current);
    stopPing.current = setTimeout(() => {
      socket.emit("chat:escribiendo", typingPayload(false));
      lastPing.current = 0;
    }, 2500);
  }, [socket, typingPayload]);

  return { items, loading, error, hasMore, loadingMore, loadOlder, firstUnreadId, typing: Object.values(typing), send, retry, discard, pin, notifyTyping, markRead };
};
