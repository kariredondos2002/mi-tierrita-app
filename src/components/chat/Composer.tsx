import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChatAttachment, ChatMessage, DirectoryPerson, Person } from "@/types/api";
import { chatService } from "@/services/chat";
import { toApiError } from "@/lib/errors";
import type { Draft } from "@/hooks/chat";
import { formatBytes, formatDuration, joinNames, previewOf } from "./chatFormat";
import styles from "./Chat.module.css";
import plus from "./ChatPlus.module.css";

const MAX = 2000;
const MAX_FILE = 6 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,text/plain,text/csv,audio/*";

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

type Props = {
  onSend: (draft: Draft) => Promise<void>;
  onTyping: () => void;
  disabled: boolean;
  placeholder: string;
  /** Mensaje que se está citando; se envía con replyToId. */
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  /** Para escribir dentro de un hilo. */
  threadRootId?: number | null;
  /** Personas mencionables con @ (solo en el canal general y en hilos del general). */
  mentionable?: DirectoryPerson[];
  compact?: boolean;
  id?: string;
};

/** Mejor formato de grabación que admita el navegador. */
const recorderMime = (): string => ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";

/**
 * Caja de redacción: Enter envía, Shift+Enter salta de línea, crece hasta 6 líneas, avisa cerca del límite,
 * cita un mensaje, menciona con @, adjunta archivos (6 MB) y graba notas de voz.
 */
export const Composer = ({ onSend, onTyping, disabled, placeholder, replyTo = null, onCancelReply, threadRootId = null, mentionable = [], compact = false, id = "chat-input" }: Props) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mention, setMention] = useState<{ from: number; query: string } | null>(null);
  const [pick, setPick] = useState(0);
  const [rec, setRec] = useState<{ ms: number } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const recorder = useRef<{ mr: MediaRecorder; chunks: Blob[]; started: number; cancelled: boolean; timer: ReturnType<typeof setInterval> } | null>(null);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [text]);

  useEffect(() => {
    if (replyTo) area.current?.focus();
  }, [replyTo]);

  useEffect(
    () => () => {
      const r = recorder.current;
      if (r) {
        r.cancelled = true;
        clearInterval(r.timer);
        if (r.mr.state !== "inactive") r.mr.stop();
        r.mr.stream.getTracks().forEach((t) => t.stop());
      }
    },
    [],
  );

  const options = mention ? mentionable.filter((p) => `${p.username} ${p.name}`.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 6) : [];

  const detectMention = (value: string, caret: number) => {
    const m = /(^|[^\w@])@([A-Za-z0-9_.-]{0,40})$/.exec(value.slice(0, caret));
    if (!m || mentionable.length === 0) return setMention(null);
    setMention({ from: caret - (m[2]?.length ?? 0) - 1, query: m[2] ?? "" });
    setPick(0);
  };

  const insertMention = (p: Person) => {
    if (!mention) return;
    const caret = area.current?.selectionStart ?? text.length;
    const next = `${text.slice(0, mention.from)}@${p.username} ${text.slice(caret)}`;
    setText(next);
    setMention(null);
    requestAnimationFrame(() => {
      const pos = mention.from + p.username.length + 2;
      area.current?.focus();
      area.current?.setSelectionRange(pos, pos);
    });
  };

  const upload = async (blob: Blob, name: string, durationMs?: number): Promise<ChatAttachment | null> => {
    if (blob.size > MAX_FILE) {
      setError(`El archivo pesa ${formatBytes(blob.size)}; el máximo es 6 MB.`);
      return null;
    }
    setUploading(true);
    setError("");
    try {
      return await chatService.upload(blob, name, durationMs);
    } catch (err) {
      setError(toApiError(err).message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submit = async (override?: Partial<Draft>) => {
    const value = text.trim();
    const att = override?.attachment ?? attachment;
    if ((!value && !att) || sending || disabled || uploading) return;
    setSending(true);
    setError("");
    try {
      await onSend({ content: override?.attachment ? "" : value, replyTo, attachment: att, threadRootId });
      setText("");
      setAttachment(null);
      setMention(null);
      onCancelReply?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
      area.current?.focus();
    }
  };

  const startRecording = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return setError("Este navegador no permite grabar audio.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = recorderMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      const state = { mr, chunks, started: Date.now(), cancelled: false, timer: setInterval(() => setRec({ ms: Date.now() - state.started }), 250) };
      mr.onstop = () => {
        clearInterval(state.timer);
        stream.getTracks().forEach((t) => t.stop());
        recorder.current = null;
        setRec(null);
        if (state.cancelled || chunks.length === 0) return;
        const type = (mr.mimeType || mime || "audio/webm").split(";")[0] ?? "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        void (async () => {
          const att = await upload(new Blob(chunks, { type }), `audio-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.${ext}`, Date.now() - state.started);
          if (att) await submit({ attachment: att });
        })();
      };
      recorder.current = state;
      mr.start();
      setRec({ ms: 0 });
    } catch {
      setError("No se pudo usar el micrófono. Revise el permiso del navegador.");
    }
  };

  const stopRecording = (cancel: boolean) => {
    const r = recorder.current;
    if (!r) return;
    r.cancelled = cancel;
    if (r.mr.state !== "inactive") r.mr.stop();
  };

  const busy = disabled || sending;
  return (
    <div className={styles.composerZone}>
      {replyTo ? (
        <div className={plus.replyChip}>
          <span className={plus.quoteBar} aria-hidden="true" />
          <span className={plus.replyText}>
            <strong>{replyTo.recipientId === null && threadRootId === null ? `Respondiendo a ${replyTo.sender.name}` : `Citando a ${replyTo.sender.name}`}</strong>
            <small>{previewOf(replyTo)}</small>
          </span>
          <button type="button" className={styles.iconGhost} onClick={onCancelReply} aria-label="Quitar la cita">
            ×
          </button>
        </div>
      ) : null}
      {attachment ? (
        <div className={plus.replyChip}>
          <span className={plus.fileIcon} aria-hidden="true">📎</span>
          <span className={plus.replyText}>
            <strong>{attachment.fileName}</strong>
            <small>{formatBytes(attachment.sizeBytes)} · listo para enviar</small>
          </span>
          <button type="button" className={styles.iconGhost} onClick={() => setAttachment(null)} aria-label="Quitar el adjunto">
            ×
          </button>
        </div>
      ) : null}
      {rec ? (
        <div className={plus.recording} role="status">
          <span className={plus.recDot} aria-hidden="true" />
          <span>Grabando… {formatDuration(rec.ms)}</span>
          <button type="button" className={plus.recCancel} onClick={() => stopRecording(true)}>
            Cancelar
          </button>
          <button type="button" className={styles.sendBtn} onClick={() => stopRecording(false)} aria-label="Enviar la nota de voz">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 10 L17 3.5 L12.5 17 L10 11 Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : (
        <form
          className={[styles.composer, busy ? styles.composerOff : ""].join(" ")}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {mention && options.length > 0 ? (
            <ul className={plus.mentions} role="listbox" aria-label="Mencionar a una persona">
              {options.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === pick}>
                  <button type="button" className={i === pick ? plus.mentionOn : ""} onMouseDown={(e) => { e.preventDefault(); insertMention(p); }}>
                    <strong>{p.name}</strong> <small>@{p.username}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input ref={file} type="file" hidden accept={ACCEPT} onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const att = await upload(f, f.name);
            if (att) setAttachment(att);
          }} />
          <button type="button" className={plus.toolBtn} onClick={() => file.current?.click()} disabled={busy || uploading || attachment !== null} aria-label="Adjuntar un archivo" title="Adjuntar archivo (máx. 6 MB)">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="m16.5 9.5-6.2 6.2a4 4 0 0 1-5.6-5.7l6.4-6.4a2.7 2.7 0 0 1 3.8 3.8l-6.4 6.4a1.3 1.3 0 0 1-1.9-1.9l5.7-5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <label htmlFor={id} className="sr-only">
            {placeholder}
          </label>
          <textarea
            id={id}
            ref={area}
            rows={1}
            maxLength={MAX}
            value={text}
            disabled={disabled}
            placeholder={disabled ? "Sin conexión… esperando al servidor" : uploading ? "Subiendo archivo…" : placeholder}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
              detectMention(e.target.value, e.target.selectionStart);
              if (e.target.value) onTyping();
            }}
            onClick={(e) => detectMention(text, e.currentTarget.selectionStart)}
            onKeyDown={(e) => {
              if (mention && options.length > 0) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  return setPick((i) => (i + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  const p = options[pick];
                  return p ? insertMention(p) : undefined;
                }
                if (e.key === "Escape") return setMention(null);
              }
              if (e.key === "Escape" && replyTo) return onCancelReply?.();
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submit();
              }
              return undefined;
            }}
          />
          {!text.trim() && !attachment ? (
            <button type="button" className={plus.micBtn} onClick={() => void startRecording()} disabled={busy || uploading} aria-label="Grabar una nota de voz" title="Grabar nota de voz">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="7.2" y="2.5" width="5.6" height="10" rx="2.8" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <button type="submit" className={styles.sendBtn} disabled={busy || uploading} aria-label="Enviar mensaje">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 10 L17 3.5 L12.5 17 L10 11 Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </form>
      )}
      {compact ? null : (
        <div className={styles.composerFoot}>
          {error ? (
            <span className={styles.composerError} role="alert">
              {error}
            </span>
          ) : (
            <span>
              <kbd>Enter</kbd> envía · <kbd>Shift</kbd>+<kbd>Enter</kbd> nueva línea{mentionable.length > 0 ? " · @ para mencionar" : ""}
            </span>
          )}
          {text.length > MAX * 0.8 ? <span className={text.length >= MAX ? styles.limit : ""}>{text.length}/{MAX}</span> : null}
        </div>
      )}
      {compact && error ? (
        <div className={styles.composerFoot}>
          <span className={styles.composerError} role="alert">
            {error}
          </span>
        </div>
      ) : null}
    </div>
  );
};
