import { useEffect, useState } from "react";
import { useExperienceStore } from "@/stores/experience";

let webglCache: boolean | null = null;

/** ¿El navegador puede dibujar WebGL? Se consulta una sola vez por sesión. */
export const hasWebGL = (): boolean => {
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    webglCache = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
};

const query = (q: string): boolean => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(q).matches;

/** Escucha una media query y devuelve si se cumple. */
export const useMedia = (q: string): boolean => {
  const [matches, setMatches] = useState(() => query(q));
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(q);
    const on = () => setMatches(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, [q]);
  return matches;
};

export type Tier = "high" | "low";

/**
 * Capacidad del dispositivo para la escena 3D:
 * - low en celulares y equipos modestos: menos partículas, sin sombras dinámicas, resolución limitada.
 * - reducedMotion: sin vuelos de cámara ni partículas en movimiento (preferencia del sistema).
 * - show3D: la vista 3D solo se dibuja si hay WebGL y el usuario no eligió la vista en lista.
 */
export const useImmersive = () => {
  const mode = useExperienceStore((s) => s.mode);
  const setMode = useExperienceStore((s) => s.setMode);
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const narrow = useMedia("(max-width: 760px)");
  const webgl = hasWebGL();
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  const memory = typeof navigator !== "undefined" ? ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) : 8;
  const tier: Tier = narrow || cores <= 4 || memory <= 4 ? "low" : "high";
  return { mode, setMode, webgl, reducedMotion, narrow, tier, show3D: webgl && mode === "3d" };
};
