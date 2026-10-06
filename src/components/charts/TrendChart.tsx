import { useState } from "react";
import { niceTicks, useWidth } from "./useWidth";
import styles from "./charts.module.css";

export type TrendPoint = { label: string; value: number; secondary?: number };

type Props = {
  data: TrendPoint[];
  format: (v: number) => string;
  formatTip?: (v: number) => string;
  height?: number;
  /** Nombre de la serie principal y de la secundaria (por ejemplo, contado / crédito). */
  names?: [string, string?];
};

/** Área de tendencia (BI): curva suavizada, rejilla, línea secundaria opcional y lectura al pasar el cursor. */
export const TrendChart = ({ data, format, formatTip, height = 260, names = ["Total"] }: Props) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;
  const pad = { top: 16, bottom: 30, left: 60, right: 14 };
  const max = Math.max(...data.map((d) => Math.max(d.value, d.secondary ?? 0)), 1);
  const ticks = niceTicks(0, max, 4);
  const top = ticks[ticks.length - 1] ?? max;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const sx = (i: number) => pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const sy = (v: number) => pad.top + innerH - (v / top) * innerH;
  const smooth = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = sx(i);
        const y = sy(v);
        if (i === 0) return `M${x},${y}`;
        const px = sx(i - 1);
        const py = sy(vals[i - 1] ?? 0);
        const cx = (px + x) / 2;
        return `C${cx},${py} ${cx},${y} ${x},${y}`;
      })
      .join(" ");
  const main = smooth(data.map((d) => d.value));
  const hasSecondary = data.some((d) => d.secondary !== undefined);
  const labelEvery = Math.max(1, Math.ceil((data.length * 62) / innerW));
  const h = hover !== null ? data[hover] : undefined;
  const tip = formatTip ?? format;
  return (
    <div ref={ref} className={styles.wrap}>
      <svg
        className={styles.svg}
        width={width}
        height={height}
        role="img"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const rel = (e.clientX - box.left - pad.left) / innerW;
          setHover(Math.min(data.length - 1, Math.max(0, Math.round(rel * (data.length - 1)))));
        }}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
            <text x={pad.left - 8} y={sy(t) + 4} textAnchor="end" className={styles.tick}>
              {t === 0 ? "0" : format(t)}
            </text>
          </g>
        ))}
        <path d={`${main} L${sx(data.length - 1)},${sy(0)} L${sx(0)},${sy(0)} Z`} fill="url(#trendFill)" />
        <path d={main} className={styles.trendLine} />
        {hasSecondary ? <path d={smooth(data.map((d) => d.secondary ?? 0))} className={styles.trendSecondary} /> : null}
        {data.map((d, i) =>
          (i % labelEvery === 0 && (data.length - 1 - i >= labelEvery || i === data.length - 1)) || i === data.length - 1 ? (
            <text key={`${d.label}-${i}`} x={sx(i)} y={height - 9} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className={styles.tick}>
              {d.label}
            </text>
          ) : null,
        )}
        {h !== undefined && hover !== null ? (
          <g>
            <line x1={sx(hover)} x2={sx(hover)} y1={pad.top} y2={pad.top + innerH} className={styles.cursor} />
            <circle cx={sx(hover)} cy={sy(h.value)} r={5} className={styles.dotStrong} />
            {h.secondary !== undefined ? <circle cx={sx(hover)} cy={sy(h.secondary)} r={4} className={styles.dotSecondary} /> : null}
          </g>
        ) : null}
      </svg>
      {h !== undefined && hover !== null ? (
        <div className={styles.tooltip} style={{ left: Math.min(Math.max(sx(hover) - 80, 0), width - 170), top: 4 }}>
          <strong>{h.label}</strong>
          <span>
            <i className={styles.keyMain} /> {names[0]}: {tip(h.value)}
          </span>
          {h.secondary !== undefined && names[1] ? (
            <span>
              <i className={styles.keySecondary} /> {names[1]}: {tip(h.secondary)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
