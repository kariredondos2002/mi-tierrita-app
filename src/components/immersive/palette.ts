/**
 * Colores de las escenas 3D. El escenario es siempre nocturno («campo de noche»), en ambos temas, para que
 * los elementos emisivos y las etiquetas en vidrio mantengan contraste AA. Son los mismos tonos de «Tierra viva».
 */
export const STAGE = {
  bgTop: "#12352a",
  bgBottom: "#08150f",
  ground: "#0f2a20",
  groundLine: "#1f4a38",
  forest: "#1d4a37",
  leaf: "#2c6a4e",
  sprout: "#9fd4b4",
  harvest: "#e3a33b",
  clay: "#c0612b",
  sky: "#6aaed6",
  bad: "#f19a90",
  badSolid: "#d4553f",
  ink: "#f4faf6",
  muted: "#a9c2b3",
  wood: "#6b4a2e",
  metal: "#9fb3a8",
} as const;

/** Tono semántico → color de material. */
export const toneColor = (tone: "good" | "warn" | "bad" | "neutral"): string =>
  tone === "good" ? STAGE.sprout : tone === "warn" ? STAGE.harvest : tone === "bad" ? STAGE.badSolid : STAGE.sky;
