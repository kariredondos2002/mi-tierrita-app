import { useEffect, useRef } from "react";

/** Antepone «(n)» al título de la pestaña mientras haya pendientes (mensajes y avisos sin leer). */
export const useUnreadInTitle = (count: number): void => {
  const base = useRef(document.title.replace(/^\(\d+\)\s*/, ""));
  useEffect(() => {
    document.title = count > 0 ? `(${count > 99 ? "99+" : count}) ${base.current}` : base.current;
  }, [count]);
  useEffect(() => {
    const original = base.current;
    return () => {
      document.title = original;
    };
  }, []);
};
