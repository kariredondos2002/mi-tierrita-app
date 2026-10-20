import { useState } from "react";
import type { ChatMessage } from "@/types/api";
import { previewOf, timeOf, dayLabel } from "./chatFormat";
import styles from "./ChatPlus.module.css";

/** Franja de mensajes fijados bajo el encabezado: muestra el más reciente y despliega la lista completa. */
export const PinnedBar = ({ pinned, canUnpin, onJump, onUnpin }: { pinned: ChatMessage[]; canUnpin: boolean; onJump: (id: number) => void; onUnpin: (m: ChatMessage) => void }) => {
  const [open, setOpen] = useState(false);
  if (pinned.length === 0) return null;
  const latest = pinned[0] as ChatMessage;
  return (
    <div className={styles.pinned}>
      <div className={styles.pinnedRow}>
        <span aria-hidden="true">📌</span>
        <button type="button" className={styles.pinnedMain} onClick={() => onJump(latest.id)} title="Ir al mensaje fijado">
          <strong>{latest.sender.name}</strong> <span>{previewOf(latest)}</span>
        </button>
        {pinned.length > 1 ? (
          <button type="button" className={styles.pinnedMore} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {pinned.length} fijados {open ? "▴" : "▾"}
          </button>
        ) : canUnpin ? (
          <button type="button" className={styles.pinnedMore} onClick={() => onUnpin(latest)}>
            Desfijar
          </button>
        ) : null}
      </div>
      {open ? (
        <ul className={styles.pinnedList}>
          {pinned.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onJump(m.id)}>
                <strong>{m.sender.name}</strong> <small>{dayLabel(m.createdAt)} {timeOf(m.createdAt)}</small>
                <span>{previewOf(m)}</span>
              </button>
              {canUnpin ? (
                <button type="button" className={styles.pinnedMore} onClick={() => onUnpin(m)}>
                  Desfijar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
