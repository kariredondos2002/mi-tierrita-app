import { useState } from "react";
import { niceTicks, useWidth } from "./useWidth";
import styles from "./charts.module.css";

export type BarDatum = { label: string; value: number; alt?: boolean };

/** Barras horizontales en HTML: la etiqueta completa a la izquierda (se ajusta en dos líneas), barra y valor. */
export const HBarChart = ({ data, format, color, stacked = false }: { data: BarDatum[]; format: (v: number) => string; color?: string; stacked?: boolean }) => {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  if (stacked) {
    return (
      <div className={styles.hbars} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join("; ")}>
        {data.map((d) => (
          <div key={d.label} className={styles.hstack}>
            <div className={styles.hstackTop}>
              <span className={styles.hlabel}>{d.label}</span>
              <span className={styles.hvalue}>{format(d.value)}</span>
            </div>
            <span className={styles.htrack}>
              <span className={[styles.hbar, d.alt ? styles.hbarAlt : ""].join(" ")} style={{ width: `${(Math.abs(d.value) / max) * 100}%`, ...(color ? { background: color } : {}) }} />
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={styles.hbars} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join("; ")}>
      {data.map((d, i) => (
        <div key={d.label} className={styles.hrow}>
          <span className={styles.hrank}>{i + 1}</span>
          <span className={styles.hlabel} title={d.label}>
            {d.label}
          </span>
          <span className={styles.htrack}>
            <span className={[styles.hbar, d.alt ? styles.hbarAlt : ""].join(" ")} style={{ width: `${(Math.abs(d.value) / max) * 100}%`, ...(color ? { background: color } : {}) }} />
          </span>
          <span className={styles.hvalue}>{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
};

/** Barras verticales con rejilla, valores al pasar el cursor y etiquetas que se espacian según el ancho. */
export const VBarChart = ({ data, format, height = 230, showValues }: { data: BarDatum[]; format: (v: number) => string; height?: number; showValues?: boolean }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 22, bottom: 30, left: 54, right: 8 };
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const ticks = niceTicks(0, max, 4);
  const top = ticks[ticks.length - 1] ?? max;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const slot = innerW / Math.max(data.length, 1);
  const barW = Math.min(slot * 0.62, 46);
  const labelEvery = Math.max(1, Math.ceil((data.length * 64) / innerW));
  const values = showValues ?? data.length <= 8;
  const sy = (v: number) => pad.top + innerH - (Math.abs(v) / top) * innerH;
  return (
    <div ref={ref} className={styles.wrap}>
      <svg className={styles.svg} width={width} height={height} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
            <text x={pad.left - 8} y={sy(t) + 4} textAnchor="end" className={styles.tick}>
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + slot * i + (slot - barW) / 2;
          const y = sy(d.value);
          return (
            <g key={`${d.label}-${i}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.left + slot * i} y={pad.top} width={slot} height={innerH} fill="transparent" />
              <rect x={x} y={y} width={barW} height={Math.max(pad.top + innerH - y, 1)} rx={Math.min(5, barW / 3)} className={[d.alt ? styles.barAlt : styles.bar, hover !== null && hover !== i ? styles.dim : ""].join(" ")} />
              {values || hover === i ? (
                <text x={x + barW / 2} y={y - 7} textAnchor="middle" className={styles.value}>
                  {format(d.value)}
                </text>
              ) : null}
              {i % labelEvery === 0 ? (
                <text x={x + barW / 2} y={height - 10} textAnchor="middle" className={styles.tick}>
                  {d.label.length > 14 ? `${d.label.slice(0, 13)}…` : d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
