import { useCallback, useEffect, useRef, useState } from "react";
import { chatService } from "@/services/chat";
import { useRealtimeStore, useSocketEvent } from "@/realtime/socket";
import { useSessionStore } from "@/stores/session";
import { toApiError } from "@/lib/errors";
import type { ChatMessage, Person } from "@/types/api";

const TYPING_TTL_MS = 4000;
const MAX_ITEMS = 400;

export type ChatTarget = { kind: "general" } | { kind: "private"; userId: number };

/** Elemento de la lista: un mensaje o un aviso del sistema (entró / salió) en el canal general. */
export type ChatItem =
  | (ChatMessage & { type: "message" })
  | { type: "system"; id: string; action: "joined" | "left"; person: Pick<Person, "id" | "name">; createdAt: string };

type TypingEvent = { from: Person; recipientId: number | null; typing: boolean };
type ReadEvent = { readerId: number; otherId: number; at: string };
type Ack = { ok: true; message: ChatMessage } | { ok: false; error: string };

const ERROR_TEXT: Record<string, string> = {
  "400": "El mensaje está vacío o es demasiado largo.",
  "603": "Esa persona ya no está disponible.",
  "640": "Va muy rápido: espere unos segundos antes de enviar otro mensaje.",
};

/**
 * Estado de una conversación en tiempo real (adaptado de useConversacion de SoftUnity):
 * historial por REST con «cargar anteriores», mensajes nuevos por socket, «está escribiendo…»,
 * confirmación de lectura en privados y respaldo REST si el socket no está conectado.
 */
export const useConversation = (target: ChatTarget) => {
  const socket = useRealtimeStore((s) => s.socket);
  const status = useRealtimeStore((s) => s.status);
  const me = useSessionStore((s) => s.user?.id ?? 0);
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

  const markRead = useCallback(() => {
    if (otherId === null) return;
    if (socket?.connected) socket.emit("chat:leido", { userId: otherId });
    else void chatService.markRead(otherId).catch(() => undefined);
  }, [otherId, socket]);

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
    fetchPage()
      .then((page) => {
        if (!alive) return;
        setItems((prev) => {
          const system = otherId === null ? prev.filter((x) => x.type === "system") : [];
          return [...page.messages.map((m) => ({ ...m, type: "message" as const })), ...system].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        });
        setHasMore(page.hasMore);
        if (otherId !== null) setFirstUnreadId((cur) => cur ?? page.messages.find((m) => m.sender.id !== me && m.readAt === null)?.id ?? null);
        markRead();
      })
      .catch((err: unknown) => alive && setError(toApiError(err).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, status === "online"]);

  const clearTyping = useCallback((uid: number) => {
    clearTimeout(timers.current[uid]);
    setTyping((t) => {
      if (!(uid in t)) return t;
      const next = { ...t };
      delete next[uid];
      return next;
    });
  }, []);

  const append = useCallback((m: ChatMessage) => {
    setItems((prev) => (prev.some((x) => x.type === "message" && x.id === m.id) ? prev : [...prev, { ...m, type: "message" as const }].slice(-MAX_ITEMS)));
  }, []);

  useSocketEvent<ChatMessage>(otherId === null ? "chat:mensaje" : "chat:privado", (m) => {
    if (!belongs(m)) return;
    clearTyping(m.sender.id);
    append(m);
    if (otherId !== null && m.sender.id !== me && !document.hidden) markRead();
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

  const loadOlder = useCallback(async () => {
    const first = items.find((x) => x.type === "message");
    if (!first || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(first.createdAt);
      setItems((prev) => [...page.messages.filter((m) => !prev.some((x) => x.type === "message" && x.id === m.id)).map((m) => ({ ...m, type: "message" as const })), ...prev]);
      setHasMore(page.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [items, loadingMore, fetchPage]);

  const typingPayload = useCallback((value: boolean) => ({ recipientId: otherId, typing: value }), [otherId]);

  const send = useCallback(
    async (content: string): Promise<void> => {
      clearTimeout(stopPing.current);
      lastPing.current = 0;
      if (socket?.connected) {
        socket.emit("chat:escribiendo", typingPayload(false));
        const ack = (await socket.timeout(6000).emitWithAck(otherId === null ? "chat:mensaje" : "chat:privado", otherId === null ? content : { recipientId: otherId, content })) as Ack;
        if (!ack.ok) throw new Error(ERROR_TEXT[ack.error] ?? "No se pudo enviar el mensaje.");
        append(ack.message);
        return;
      }
      // Respaldo REST: el servidor difunde los mismos eventos a los demás.
      try {
        append(otherId === null ? await chatService.sendGeneral(content) : await chatService.sendPrivate(otherId, content));
      } catch (err) {
        throw new Error(toApiError(err).message);
      }
    },
    [socket, otherId, append, typingPayload],
  );

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

  return { items, loading, error, hasMore, loadingMore, loadOlder, firstUnreadId, typing: Object.values(typing), send, notifyTyping };
};
