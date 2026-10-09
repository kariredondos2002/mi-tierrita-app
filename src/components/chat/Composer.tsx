import { useLayoutEffect, useRef, useState } from "react";
import type { Person } from "@/types/api";
import { joinNames } from "./chatFormat";
import styles from "./Chat.module.css";

const MAX = 2000;

/** «Fulano está escribiendo…» con los tres puntos animados. */
export const TypingIndicator = ({ people }: { people: Person[] }) => {
  if (people.length === 0) return <div className={styles.typing} aria-hidden="true" />;
  return (
    <div className={styles.typing} role="status">
      <span className={styles.dots} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        <strong>{joinNames(people.map((p) => p.name.split(" ")[0] ?? p.name))}</strong> {people.length === 1 ? "está escribiendo" : "están escribiendo"}…
      </span>
    </div>
  );
};

/** Caja de redacción: Enter envía, Shift+Enter salta de línea, crece hasta 6 líneas y avisa cerca del límite. */
export const Composer = ({ onSend, onTyping, disabled, placeholder }: { onSend: (text: string) => Promise<void>; onTyping: () => void; disabled: boolean; placeholder: string }) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [text]);

  const send = async () => {
    const value = text.trim();
    if (!value || sending || disabled) return;
    setSending(true);
    setError("");
    try {
      await onSend(value);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
      area.current?.focus();
    }
  };

  return (
    <div className={styles.composerZone}>
      <form
        className={[styles.composer, disabled ? styles.composerOff : ""].join(" ")}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          {placeholder}
        </label>
        <textarea
          id="chat-input"
          ref={area}
          rows={1}
          maxLength={MAX}
          value={text}
          disabled={disabled}
          placeholder={disabled ? "Sin conexión… esperando al servidor" : placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
            if (e.target.value) onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="submit" className={styles.sendBtn} disabled={!text.trim() || sending || disabled} aria-label="Enviar mensaje">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 10 L17 3.5 L12.5 17 L10 11 Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
      <div className={styles.composerFoot}>
        {error ? (
          <span className={styles.composerError} role="alert">
            {error}
          </span>
        ) : (
          <span>
            <kbd>Enter</kbd> para enviar · <kbd>Shift</kbd>+<kbd>Enter</kbd> nueva línea
          </span>
        )}
        {text.length > MAX * 0.8 ? <span className={text.length >= MAX ? styles.limit : ""}>{text.length}/{MAX}</span> : null}
      </div>
    </div>
  );
};
