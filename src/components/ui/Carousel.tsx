import { useCallback, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "./useReducedMotion";
import styles from "./Carousel.module.css";

export type CarouselSlide = {
  id: string;
  /** URL ya resuelta de la fotografía (por ejemplo con `photoUrl`). */
  image: string;
  title: string;
  text?: string;
  /** Antetítulo manuscrito. */
  tag?: string;
  /** Ruta interna a la que lleva el botón de la diapositiva. */
  to?: string;
  cta?: string;
};

type Props = {
  slides: CarouselSlide[];
  /** Nombre del carrusel para lectores de pantalla. */
  label: string;
  /** Milisegundos que permanece cada diapositiva. */
  interval?: number;
  className?: string;
};

const Arrow = ({ dir }: { dir: "prev" | "next" }) => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d={dir === "prev" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Carrusel de fotografías con zoom lento, avance automático y tres formas de control: botones, puntos con progreso,
 * teclado (← →) y deslizamiento táctil. Se detiene al pasar el cursor, al enfocarlo, con el botón de pausa (WCAG 2.2.2)
 * y por completo cuando la persona pide reducir el movimiento.
 */
export const Carousel = ({ slides, label, interval = 6500, className }: Props) => {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const startX = useRef<number | null>(null);
  const regionId = useId();
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const running = playing && !reduced && count > 1;
  const paused = hovered || focused;

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    }
  };
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    startX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
  };

  if (count === 0) return null;
  return (
    <section
      className={[styles.carousel, className ?? ""].join(" ")}
      aria-roledescription="carrusel"
      aria-label={label}
      style={{ ["--interval" as string]: `${interval}ms` }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (startX.current = null)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocused(false)}
    >
      <div className={styles.viewport} id={regionId} aria-live={running && !paused ? "off" : "polite"}>
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <article key={slide.id} className={[styles.slide, active ? styles.active : "", i % 2 === 1 ? styles.altMove : ""].join(" ")} role="group" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${count}`} inert={!active}>
              <img className={styles.img} src={slide.image} alt="" decoding="async" loading={i === 0 ? "eager" : "lazy"} draggable={false} />
              <div className={styles.veil} />
              <div className={styles.caption}>
                {slide.tag ? <p className={styles.tag}>{slide.tag}</p> : null}
                <h3 className={styles.title}>{slide.title}</h3>
                {slide.text ? <p className={styles.text}>{slide.text}</p> : null}
                {slide.to ? (
                  <Link to={slide.to} className={styles.cta}>
                    {slide.cta ?? "Abrir"} →
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {count > 1 ? (
        <div className={styles.controls}>
          <button type="button" className={styles.round} onClick={() => go(index - 1)} aria-label="Diapositiva anterior" aria-controls={regionId}>
            <Arrow dir="prev" />
          </button>
          <button type="button" className={styles.round} onClick={() => go(index + 1)} aria-label="Diapositiva siguiente" aria-controls={regionId}>
            <Arrow dir="next" />
          </button>
          <div className={styles.dots} role="group" aria-label="Elegir diapositiva">
            {slides.map((slide, i) => (
              <button key={slide.id} type="button" className={[styles.dot, i === index ? styles.dotOn : ""].join(" ")} onClick={() => go(i)} aria-label={`Ir a ${slide.title}`} aria-current={i === index}>
                {i === index && running ? <span key={index} className={styles.progress} style={{ animationPlayState: paused ? "paused" : "running" }} onAnimationEnd={() => go(index + 1)} /> : null}
              </button>
            ))}
          </div>
          {!reduced ? (
            <button type="button" className={styles.round} onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pausar el avance automático" : "Reanudar el avance automático"} aria-pressed={!playing}>
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="3.5" y="3" width="3" height="10" rx="1" fill="currentColor" />
                  <rect x="9.5" y="3" width="3" height="10" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4.5 3 13 8l-8.5 5z" fill="currentColor" />
                </svg>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
