import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConversation, usePeople, usePinned, type ChatTarget } from "@/hooks/chat";
import { useRealtimeStore } from "@/realtime/socket";
import { useSessionStore } from "@/stores/session";
import { notify } from "@/stores/toasts";
import type { ChatMessage, Person } from "@/types/api";
import { MessageList, type MessageActions } from "./MessageList";
import { Composer, TypingIndicator } from "./Composer";
import { PinnedBar } from "./PinnedBar";
import { ReceiptsModal } from "./ReceiptsModal";
import { ThreadPanel } from "./ThreadPanel";
import styles from "./Chat.module.css";
import plus from "./ChatPlus.module.css";

type NavState = { quote?: ChatMessage; focus?: number } | null;

/** Conversación completa: fijados, lista, hilo lateral, «está escribiendo…» y caja de redacción. */
export const Conversation = ({ target, channelName, channelText, placeholder, onThreadChange }: { target: ChatTarget; channelName: string; channelText: string; placeholder: string; onThreadChange?: (open: boolean) => void }) => {
  const user = useSessionStore((s) => s.user);
  const me = user?.id ?? 0;
  const status = useRealtimeStore((s) => s.status);
  const navigate = useNavigate();
  const location = useLocation();
  const nav = (location.state ?? null) as NavState;
  const c = useConversation(target);
  const people = usePeople();
  const online = useRealtimeStore((s) => s.online);
  const scope = target.kind === "general" ? "general" : target.userId;
  const pinned = usePinned(scope);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(nav?.quote ?? null);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [receiptsId, setReceiptsId] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(nav?.focus ?? null);
  const isGeneral = target.kind === "general";
  useEffect(() => onThreadChange?.(threadId !== null), [threadId, onThreadChange]);

  // Directorio por usuario para resaltar menciones; quienes están en línea cubren a personas nuevas.
  const directory = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of [...online, ...(people.data ?? [])]) map.set(p.username.toLowerCase(), p);
    return map;
  }, [online, people.data]);
  const mentionable = useMemo(() => (isGeneral ? (people.data ?? []).filter((p) => p.id !== me) : []), [isGeneral, people.data, me]);

  // Un mensaje fijado o un resultado de búsqueda puede estar más atrás: se carga historial hasta encontrarlo.
  const jumpTo = useCallback(
    async (id: number) => {
      let tries = 0;
      let more = !c.items.some((x) => x.type === "message" && x.id === id);
      while (more && tries < 12) {
        more = await c.loadOlder();
        tries += 1;
        if (c.items.some((x) => x.type === "message" && x.id === id)) break;
      }
      setFocusId(null);
      requestAnimationFrame(() => setFocusId(id));
    },
    [c],
  );
  useEffect(() => {
    if (nav?.focus) void jumpTo(nav.focus);
    // al abrir un resultado de búsqueda (también si ya estaba en esa conversación)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const actions: MessageActions = {
    onReply: (m) => setReplyTo(m),
    onOpenThread: (m) => setThreadId(m.id),
    onReplyPrivate: (m) => navigate(`/chat/${m.sender.id}`, { state: { quote: m } satisfies NavState }),
    onPin: (m, value) => void c.pin(m, value).catch((err: unknown) => notify.error(err instanceof Error ? err.message : "No se pudo fijar el mensaje.")),
    onReceipts: setReceiptsId,
    onRetry: (m) => void c.retry(m),
    onDiscard: c.discard,
    onJumpTo: (id) => void jumpTo(id),
  };

  const canPin = !isGeneral || user?.role === "ADMIN";

  return (
    <div className={plus.convWrap}>
      <div className={styles.conversation}>
        {c.error ? (
          <div className={styles.inlineError} role="alert">
            {c.error}
          </div>
        ) : null}
        <PinnedBar pinned={pinned.data ?? []} canUnpin={canPin} onJump={(id) => void jumpTo(id)} onUnpin={(m) => actions.onPin(m, false)} />
        <MessageList
          items={c.items}
          me={me}
          myRole={user?.role}
          loading={c.loading}
          channelName={channelName}
          channelText={channelText}
          hasMore={c.hasMore}
          loadingMore={c.loadingMore}
          onLoadOlder={() => void c.loadOlder()}
          isPrivate={!isGeneral}
          firstUnreadId={c.firstUnreadId}
          directory={directory}
          actions={actions}
          focusId={focusId}
        />
        <TypingIndicator people={c.typing} />
        <Composer
          onSend={async (d) => {
            await c.send(d);
          }}
          onTyping={c.notifyTyping}
          disabled={status === "connecting"}
          placeholder={placeholder}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          mentionable={mentionable}
        />
      </div>
      {threadId !== null ? (
        <ThreadPanel rootId={threadId} me={me} directory={directory} mentionable={mentionable} send={(d) => c.send(d)} onTyping={c.notifyTyping} onReceipts={setReceiptsId} onClose={() => setThreadId(null)} disabled={status === "connecting"} />
      ) : null}
      <ReceiptsModal messageId={receiptsId} onClose={() => setReceiptsId(null)} />
    </div>
  );
};
