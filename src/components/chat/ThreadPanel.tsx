import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { keys } from "@/hooks/shared";
import type { Draft } from "@/hooks/chat";
import { chatService } from "@/services/chat";
import { useSocketEvent } from "@/realtime/socket";
import { ROLE_LABELS } from "@/stores/session";
import type { ChatMessage, DirectoryPerson, Person } from "@/types/api";
import { AudioPlayer, FileView } from "./AttachmentView";
import { Composer } from "./Composer";
import { MentionText } from "./MessageList";
import { PersonAvatar } from "./PersonAvatar";
import { Ticks } from "./Ticks";
import { dayLabel, timeOf } from "./chatFormat";
import styles from "./Chat.module.css";
import plus from "./ChatPlus.module.css";

type Props = {
  rootId: number;
  me: number;
  directory: Map<string, Person>;
  mentionable: DirectoryPerson[];
  send: (d: Draft) => Promise<ChatMessage>;
  onTyping: () => void;
  onReceipts: (id: number) => void;
  onClose: () => void;
  disabled: boolean;
};

const Reply = ({ m, me, directory, onReceipts }: { m: ChatMessage; me: number; directory: Map<string, Person>; onReceipts: (id: number) => void }) => (
  <article className={[plus.reply, m.sender.id === me ? plus.replyOwn : ""].join(" ")}>
    <PersonAvatar name={m.sender.name} role={m.sender.role} size={28} />
    <div>
      <header>
        <strong>{m.sender.name}</strong>
        <span className={styles.roleTag}>{ROLE_LABELS[m.sender.role]}</span>
        <time dateTime={m.createdAt}>
          {dayLabel(m.createdAt)} {timeOf(m.createdAt)}
        </time>
      </header>
      <div className={plus.replyBody}>
        {m.attachment?.mimeType.startsWith("audio/") ? <AudioPlayer attachment={m.attachment} own={m.sender.id === me} /> : m.attachment ? <FileView attachment={m.attachment} /> : null}
        {m.content ? <MentionText content={m.content} me={me} directory={directory} /> : null}
      </div>
      {m.sender.id === me ? <Ticks receipts={m.receipts} readAt={m.readAt} onOpen={() => onReceipts(m.id)} /> : null}
    </div>
  </article>
);

/** Panel de hilo: el mensaje original y sus respuestas, que no ensucian el canal. Tiempo real y sin duplicados. */
export const ThreadPanel = ({ rootId, me, directory, mentionable, send, onTyping, onReceipts, onClose, disabled }: Props) => {
  const q = useQuery({ queryKey: [...keys.chat, "thread", rootId], queryFn: () => chatService.thread(rootId), staleTime: 0 });
  const [replies, setReplies] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (q.data) setReplies(q.data.replies);
  }, [q.data]);

  const add = useCallback(
    (m: ChatMessage) =>
      setReplies((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? { ...x, ...m, receipts: m.receipts ?? x.receipts } : x)) : [...prev, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))),
    [],
  );
  useSocketEvent<ChatMessage>(["chat:mensaje", "chat:privado"], (m) => {
    if (m.threadRootId === rootId) add(m);
  });
  useSocketEvent<{ updates: { messageId: number; total: number; delivered: number; read: number }[] }>("chat:recibos", ({ updates }) => {
    setReplies((prev) => prev.map((r) => {
      const u = updates.find((x) => x.messageId === r.id);
      return u ? { ...r, receipts: { total: u.total, delivered: u.delivered, read: u.read } } : r;
    }));
  });

  const root = q.data?.root;
  return (
    <aside className={plus.thread} aria-label="Hilo de respuestas">
      <header className={styles.membersHead}>
        <h3>Hilo</h3>
        <button type="button" className={styles.iconGhost} onClick={onClose} aria-label="Cerrar el hilo">
          ×
        </button>
      </header>
      {q.isLoading ? <p className={plus.muted}>Cargando hilo…</p> : null}
      {q.isError ? <p role="alert" className={plus.muted}>No se pudo abrir el hilo.</p> : null}
      {root ? (
        <>
          <div className={plus.threadRoot}>
            <Reply m={root} me={me} directory={directory} onReceipts={onReceipts} />
          </div>
          <p className={plus.threadCount}>{replies.length === 1 ? "1 respuesta" : `${replies.length} respuestas`}</p>
          <div className={plus.threadList} role="log" aria-live="polite">
            {replies.map((r) => (
              <Reply key={r.id} m={r} me={me} directory={directory} onReceipts={onReceipts} />
            ))}
          </div>
          <Composer
            id="thread-input"
            compact
            threadRootId={root.id}
            mentionable={root.recipientId === null ? mentionable : []}
            disabled={disabled}
            onTyping={onTyping}
            placeholder="Responder en el hilo"
            onSend={async (d) => {
              const saved = await send({ ...d, threadRootId: root.id });
              add(saved);
            }}
          />
        </>
      ) : null}
    </aside>
  );
};
