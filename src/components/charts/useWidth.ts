import { useEffect, useRef, useState } from "react";

/** Ancho real del contenedor: los SVG se dibujan a escala 1:1 para que el texto no crezca ni se encoja. */
export const useWidth = <T extends HTMLElement>(fallback = 520) => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(Math.floor(el.getBoundingClientRect().width), 200));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
};

/** Escala "bonita" para ejes: 4 o 5 marcas redondeadas. */
export const niceTicks = (min: number, max: number, count = 4): number[] => {
  if (max === min) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(Math.abs(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  let v = start;
  ticks.push(Number(v.toFixed(10)));
  while (v < max - step * 1e-9) {
    v += step;
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
};
