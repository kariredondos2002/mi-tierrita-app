import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import styles from "./Overlay.module.css";

export type PanelTone = "good" | "warn" | "bad" | "neutral";

/** Panel de vidrio con el detalle del objeto seleccionado. Entra deslizándose; Esc lo cierra. */
export const InfoPanel = ({
  open,
  eyebrow,
  title,
  tone = "neutral",
  children,
  actions,
  onClose,
  reducedMotion,
  panelKey,
}: {
  open: boolean;
  eyebrow?: string;
  title: string;
  tone?: PanelTone;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  reducedMotion: boolean;
  panelKey: string;
}) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence mode="wait">
      {open ? (
        <m.aside
          key={panelKey}
          className={[styles.panel, styles[`tone_${tone}`]].join(" ")}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 18, scale: 0.98 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          aria-labelledby={`panel-${panelKey}`}
        >
          <div className={styles.panelHead}>
            <div>
              {eyebrow ? <span className={styles.panelEyebrow}>{eyebrow}</span> : null}
              <h3 id={`panel-${panelKey}`} ref={headingRef} className={styles.panelTitle}>
                {title}
              </h3>
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar detalle (Esc)">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className={styles.panelBody}>{children}</div>
          {actions ? <div className={styles.panelActions}>{actions}</div> : null}
        </m.aside>
      ) : null}
    </AnimatePresence>
  );
};

/** Métricas del panel: etiqueta arriba, cifra grande, con aparición escalonada. */
export const MetricList = ({ items, reducedMotion }: { items: { label: string; value: string }[]; reducedMotion: boolean }) => (
  <dl className={styles.metrics}>
    {items.map((it, i) => (
      <m.div
        key={it.label}
        className={styles.metric}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 + i * 0.06, duration: 0.3 }}
      >
        <dt>{it.label}</dt>
        <dd>{it.value}</dd>
      </m.div>
    ))}
  </dl>
);

/** Anillo de progreso del recorrido (gamificación con propósito: asegurar que se revisen todos los puntos). */
export const ProgressRing = ({ done, total, label }: { done: number; total: number; label: string }) => {
  const r = 17;
  const c = 2 * Math.PI * r;
  const f = total > 0 ? done / total : 0;
  return (
    <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label}>
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <m.circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="#9fd4b4"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - f) }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <div>
        <strong>
          {done}/{total}
        </strong>
        <span>{label}</span>
      </div>
    </div>
  );
};

/** Leyenda de colores de la escena. */
export const Legend = ({ items }: { items: { color: string; label: string }[] }) => (
  <ul className={styles.legend} aria-label="Leyenda">
    {items.map((i) => (
      <li key={i.label}>
        <span style={{ background: i.color }} />
        {i.label}
      </li>
    ))}
  </ul>
);

/**
 * Barra de objetos navegable con teclado: alternativa a apuntar en 3D.
 * Flechas izquierda/derecha recorren, Enter selecciona, Inicio/Fin saltan.
 */
export const Dock = <K extends string>({
  items,
  selected,
  onSelect,
  label,
}: {
  items: { key: K; label: string; done?: boolean; alert?: boolean }[];
  selected: K | null;
  onSelect: (key: K) => void;
  label: string;
}) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = items.length;
    const go = (j: number) => {
      const k = ((j % n) + n) % n;
      refs.current[k]?.focus();
      onSelect(items[k]!.key);
      e.preventDefault();
    };
    if (e.key === "ArrowRight" || e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(n - 1);
  };
  return (
    <div className={styles.dock} role="toolbar" aria-label={label}>
      {items.map((it, i) => (
        <button
          key={it.key}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          aria-pressed={selected === it.key}
          tabIndex={selected === it.key || (selected === null && i === 0) ? 0 : -1}
          className={[styles.dockItem, selected === it.key ? styles.dockOn : "", it.done ? styles.dockDone : ""].join(" ")}
          onClick={() => onSelect(it.key)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {it.alert ? <span className={styles.dockAlert} aria-label="Punto crítico" /> : null}
          {it.label}
          {it.done ? (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-label="explorado">
              <path d="M2.5 6.2 L5 8.6 L9.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>
      ))}
    </div>
  );
};

/** Celebración breve al completar un recorrido (destellos que se dispersan); sin animación si se pidió reducirla. */
export const Reward = ({ show, title, text, onClose, reducedMotion }: { show: boolean; title: string; text: string; onClose: () => void; reducedMotion: boolean }) => (
  <AnimatePresence>
    {show ? (
      <m.div
        className={styles.reward}
        role="status"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {!reducedMotion
          ? Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              return (
                <m.i
                  key={i}
                  className={styles.spark}
                  style={{ background: ["#9fd4b4", "#e3a33b", "#6aaed6"][i % 3] }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(a) * 90, y: Math.sin(a) * 60, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
                />
              );
            })
          : null}
        <div className={styles.medal} aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0d261c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5 l2.6 5.3 5.9 .9 -4.3 4.1 1 5.8 -5.2 -2.7 -5.2 2.7 1 -5.8 -4.3 -4.1 5.9 -.9 z" fill="#e3a33b" />
          </svg>
        </div>
        <div>
          <strong>{title}</strong>
          <span>{text}</span>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
          <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </m.div>
    ) : null}
  </AnimatePresence>
);

/** Región silenciosa que anuncia la selección a los lectores de pantalla. */
export const LiveRegion = ({ text }: { text: string }) => (
  <p className="sr-only" aria-live="polite">
    {text}
  </p>
);
