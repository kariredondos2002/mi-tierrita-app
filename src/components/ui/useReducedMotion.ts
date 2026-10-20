import { useEffect, useState } from "react";

/** true si la persona pidió «reducir movimiento» en su sistema: se apagan carruseles automáticos y zoom de fotos. */
export const useReducedMotion = (): boolean => {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
};
