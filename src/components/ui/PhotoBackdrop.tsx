import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";
import styles from "./PhotoBackdrop.module.css";

type Props = {
  /** URLs ya resueltas de las fotos; con una sola solo hay zoom lento, con varias también fundido cruzado. */
  images: string[];
  /** Milisegundos entre fotos. */
  interval?: number;
  /** Punto focal de cada foto (CSS object-position). */
  position?: string;
};

/**
 * Fondo fotográfico con movimiento lento (zoom y desplazamiento tipo «Ken Burns») y fundido entre fotos. Es decorativo
 * (alt vacío) y queda detrás del contenido: el contenedor debe tener `position: relative`, `isolation: isolate` y
 * `overflow: hidden`. Sin animación cuando la persona pide reducir el movimiento.
 */
export const PhotoBackdrop = ({ images, interval = 9000, position = "center 40%" }: Props) => {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const count = images.length;

  useEffect(() => {
    setActive(0);
    if (count < 2 || reduced) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % count), interval);
    return () => window.clearInterval(timer);
  }, [count, interval, reduced]);

  return (
    <div className={[styles.backdrop, reduced ? styles.still : ""].join(" ")} aria-hidden="true">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          decoding="async"
          loading={i === 0 ? "eager" : "lazy"}
          className={[styles.layer, i === active ? styles.on : "", i % 2 === 1 ? styles.alt : ""].join(" ")}
          style={{ objectPosition: position }}
        />
      ))}
    </div>
  );
};
