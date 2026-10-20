import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { keys } from "@/hooks/shared";
import { chatService } from "@/services/chat";
import type { ChatMessage } from "@/types/api";
import { PersonAvatar } from "./PersonAvatar";
import { dayLabel, previewOf, timeOf } from "./chatFormat";
import styles from "./ChatPlus.module.css";
import chat from "./Chat.module.css";

const Hit = ({ text, q }: { text: string; q: string }) => {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
};

/** Búsqueda en el chat: solo entre lo que la persona puede ver. Un resultado lleva a su conversación y mensaje. */
export const ChatSearch = ({ me, scope, scopeLabel, onPick, onClose }: { me: number; scope: "general" | number; scopeLabel: string; onPick: (m: ChatMessage) => void; onClose: () => void }) => {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  const res = useQuery({ queryKey: [...keys.chat, "search", q, all ? "all" : scope], queryFn: () => chatService.search(q, all ? undefined : scope), enabled: q.length >= 2 });
  return (
    <aside className={styles.searchPanel} aria-label="Buscar en el chat">
      <header className={chat.membersHead}>
        <h3>Buscar mensajes</h3>
        <button type="button" className={chat.iconGhost} onClick={onClose} aria-label="Cerrar la búsqueda">
          ×
        </button>
      </header>
      <input ref={input} type="search" className={styles.searchInput} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escriba al menos 2 letras" aria-label="Texto a buscar" />
      <label className={styles.searchScope}>
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Buscar en todo el chat (no solo en {scopeLabel})
      </label>
      {q.length < 2 ? <p className={styles.muted}>Busca en el texto de los mensajes y en el nombre de los archivos.</p> : null}
      {res.isFetching ? <p className={styles.muted}>Buscando…</p> : null}
      {res.data && res.data.length === 0 && !res.isFetching ? <p className={styles.muted}>Sin resultados para «{q}».</p> : null}
      <ul className={styles.hits}>
        {(res.data ?? []).map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onPick(m)}>
              <PersonAvatar name={m.sender.name} role={m.sender.role} size={28} />
              <span>
                <strong>{m.sender.id === me ? "Usted" : m.sender.name}</strong>
                <small>
                  {m.recipientId === null ? "#general" : "Privado"} · {dayLabel(m.createdAt)} {timeOf(m.createdAt)}
                </small>
                <span className={styles.hitText}>
                  <Hit text={previewOf(m)} q={q} />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};
