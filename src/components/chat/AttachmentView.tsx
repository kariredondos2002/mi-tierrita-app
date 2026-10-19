import { useEffect, useRef, useState } from "react";
import { chatService } from "@/services/chat";
import type { ChatAttachment } from "@/types/api";
import { formatBytes, formatDuration } from "./chatFormat";
import styles from "./ChatPlus.module.css";

/** Descarga el adjunto con el token y entrega una URL temporal (las etiquetas <audio> e <img> no envían cabeceras). */
export const useBlobUrl = (id: number, enabled: boolean): { url: string | null; error: boolean } => {
  const [state, setState] = useState<{ url: string | null; error: boolean }>({ url: null, error: false });
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    let made: string | null = null;
    chatService
      .download(id)
      .then((blob) => {
        if (!alive) return;
        made = URL.createObjectURL(blob);
        setState({ url: made, error: false });
      })
      .catch(() => alive && setState({ url: null, error: true }));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id, enabled]);
  return state;
};

const SPEEDS = [1, 1.5, 2] as const;

/** Reproductor de notas de voz: reproducir, barra de avance, duración y velocidad. */
export const AudioPlayer = ({ attachment, own }: { attachment: ChatAttachment; own: boolean }) => {
  const [wanted, setWanted] = useState(false);
  const { url, error } = useBlobUrl(attachment.id, wanted);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const total = attachment.durationMs ?? 0;

  useEffect(() => {
    if (url && audio.current) void audio.current.play().catch(() => setPlaying(false));
  }, [url]);

  const toggle = () => {
    if (!wanted) return setWanted(true);
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  return (
    <div className={[styles.audio, own ? styles.audioOwn : ""].join(" ")}>
      <button type="button" className={styles.playBtn} onClick={toggle} aria-label={playing ? "Pausar el audio" : "Reproducir el audio"} aria-pressed={playing}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <rect x="2.5" y="2" width="3" height="10" rx="1" fill="currentColor" />
            <rect x="8.5" y="2" width="3" height="10" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M3.5 2 12 7 3.5 12Z" fill="currentColor" />
          </svg>
        )}
      </button>
      <input
        type="range"
        className={styles.seek}
        min={0}
        max={Math.max(total, 1)}
        value={Math.min(pos, Math.max(total, 1))}
        aria-label="Posición del audio"
        onChange={(e) => {
          const v = Number(e.target.value);
          setPos(v);
          if (audio.current) audio.current.currentTime = v / 1000;
        }}
      />
      <span className={styles.audioTime}>{error ? "Error" : formatDuration(playing || pos > 0 ? pos : total)}</span>
      <button type="button" className={styles.speed} onClick={() => setSpeed((s) => { const n = SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length] ?? 1; if (audio.current) audio.current.playbackRate = n; return n; })} aria-label={`Velocidad ${speed}x`}>
        {speed}x
      </button>
      {url ? (
        <audio
          ref={audio}
          src={url}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setPos(0); }}
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime * 1000)}
        />
      ) : null}
    </div>
  );
};

const saveBlob = async (a: ChatAttachment) => {
  const blob = await chatService.download(a.id);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = a.fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** Imagen con vista previa (se abre grande al pulsar) o archivo con botón de descarga. */
export const FileView = ({ attachment }: { attachment: ChatAttachment }) => {
  const isImage = attachment.mimeType.startsWith("image/");
  const { url } = useBlobUrl(attachment.id, isImage);
  const [big, setBig] = useState(false);
  const [busy, setBusy] = useState(false);
  if (isImage) {
    return (
      <>
        <button type="button" className={styles.image} onClick={() => setBig(true)} aria-label={`Abrir la imagen ${attachment.fileName}`}>
          {url ? <img src={url} alt={attachment.fileName} /> : <span className={styles.imageLoading}>Cargando imagen…</span>}
        </button>
        {big && url ? (
          <div className={styles.lightbox} role="dialog" aria-label={attachment.fileName} onClick={() => setBig(false)}>
            <img src={url} alt={attachment.fileName} />
            <button type="button" onClick={() => setBig(false)} aria-label="Cerrar">×</button>
          </div>
        ) : null}
      </>
    );
  }
  return (
    <button type="button" className={styles.file} disabled={busy} onClick={() => { setBusy(true); void saveBlob(attachment).finally(() => setBusy(false)); }}>
      <span className={styles.fileIcon} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 2.5h7l4 4V17a.5.5 0 0 1-.5.5h-10.5A.5.5 0 0 1 4.5 17V3a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M12 2.5V7h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </span>
      <span className={styles.fileText}>
        <strong>{attachment.fileName}</strong>
        <small>{busy ? "Descargando…" : `${formatBytes(attachment.sizeBytes)} · Descargar`}</small>
      </span>
    </button>
  );
};
