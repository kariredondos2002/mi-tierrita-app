/** Formatos del chat: hora, separadores de día y «hace un rato». */
export const timeOf = (iso: string): string => new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });

export const sameDay = (a: string, b: string): boolean => new Date(a).toDateString() === new Date(b).toDateString();

export const dayLabel = (iso: string, now = new Date()): string => {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" }).replace(/^\w/, (c) => c.toUpperCase());
};

export const relative = (iso: string | null, now = Date.now()): string => {
  if (!iso) return "sin conexiones registradas";
  const min = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
};

/** «Ana», «Ana y Luis», «Ana, Luis y Marta». */
export const joinNames = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;

/** Agrupa mensajes seguidos del mismo autor con menos de 5 minutos de diferencia. */
export const isContinuation = (prev: { type: string; createdAt: string; sender?: { id: number } } | undefined, cur: { type: string; createdAt: string; sender?: { id: number } }): boolean =>
  Boolean(
    prev &&
      prev.type === "message" &&
      cur.type === "message" &&
      prev.sender?.id === cur.sender?.id &&
      sameDay(prev.createdAt, cur.createdAt) &&
      new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000,
  );

/** «últ. conexión hace 3 h» o «aún no se ha conectado». */
export const lastSeenText = (iso: string | null | undefined): string => (iso ? `últ. conexión ${relative(iso)}` : "aún no se ha conectado");

/** Texto corto de un mensaje para listas, citas y avisos. */
export const previewOf = (m: { content: string; kind: "TEXT" | "AUDIO" | "FILE" }): string =>
  m.content.trim() || (m.kind === "AUDIO" ? "🎤 Mensaje de audio" : m.kind === "FILE" ? "📎 Archivo adjunto" : "");

export const formatBytes = (n: number): string => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** 83_000 ms → «1:23». */
export const formatDuration = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Misma regla que el servidor: @usuario precedido de inicio o de un carácter que no sea palabra. */
export const MENTION_RE = /(^|[^\w@])@([A-Za-z0-9_.-]{2,40})/g;

export type Chunk = { text: string; mention?: string };
/** Parte un texto en trozos normales y menciones (@usuario) para resaltarlas. */
export const chunkMentions = (content: string): Chunk[] => {
  const out: Chunk[] = [];
  let last = 0;
  for (const m of content.matchAll(MENTION_RE)) {
    const start = (m.index ?? 0) + (m[1]?.length ?? 0);
    if (start > last) out.push({ text: content.slice(last, start) });
    out.push({ text: `@${m[2]}`, mention: (m[2] as string).toLowerCase() });
    last = start + 1 + (m[2]?.length ?? 0);
  }
  if (last < content.length) out.push({ text: content.slice(last) });
  return out;
};
