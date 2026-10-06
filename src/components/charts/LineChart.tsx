import { niceTicks, useWidth } from "./useWidth";
import styles from "./charts.module.css";

export type LinePoint = { x: number; y: number };

type Props = {
  points: LinePoint[];
  formatX: (v: number) => string;
  formatY: (v: number) => string;
  /** Marca vertical (por ejemplo, el punto de equilibrio) y etiqueta. */
  marker?: { x: number; label: string } | undefined;
  highlightX?: number | undefined;
  height?: number;
};

/** Línea con rejilla, eje cero, zona negativa sombreada y marcador opcional; dibujada al ancho real. */
export const LineChart = ({ points, formatX, formatY, marker, highlightX, height = 250 }: Props) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const pad = { top: 18, bottom: 32, left: 64, right: 18 };
  if (points.length === 0) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const ticks = niceTicks(Math.min(0, ...ys), Math.max(0, ...ys), 4);
  const minY = Math.min(ticks[0] ?? 0, 0);
  const maxY = Math.max(ticks[ticks.length - 1] ?? 0, 0);
  const sx = (x: number) => pad.left + ((x - minX) / (maxX - minX || 1)) * (width - pad.left - pad.right);
  const sy = (y: number) => pad.top + ((maxY - y) / (maxY - minY || 1)) * (height - pad.top - pad.bottom);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const zeroY = sy(0);
  const labelEvery = Math.max(1, Math.ceil((points.length * 60) / (width - pad.left - pad.right)));
  return (
    <div ref={ref} className={styles.wrap}>
      <svg className={styles.svg} width={width} height={height} role="img">
        {minY < 0 ? <rect x={pad.left} y={zeroY} width={width - pad.left - pad.right} height={sy(minY) - zeroY} className={styles.negativeArea} /> : null}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} className={t === 0 ? styles.zero : styles.grid} />
            <text x={pad.left - 8} y={sy(t) + 4} textAnchor="end" className={styles.tick}>
              {t === 0 ? "0" : formatY(t)}
            </text>
          </g>
        ))}
        {marker && marker.x >= minX && marker.x <= maxX ? (
          <g>
            <line x1={sx(marker.x)} x2={sx(marker.x)} y1={pad.top} y2={height - pad.bottom} className={styles.marker} />
            <text x={sx(marker.x) + 5} y={pad.top + 11} className={styles.markerLabel}>
              {marker.label}
            </text>
          </g>
        ) : null}
        <path d={`${path} L${sx(maxX)},${zeroY} L${sx(minX)},${zeroY} Z`} className={styles.area} />
        <path d={path} className={styles.line} />
        {points.map((p) => (
          <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={p.x === highlightX ? 5.5 : 3.5} className={p.x === highlightX ? styles.dotStrong : styles.dot} />
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={`x${p.x}`} x={sx(p.x)} y={height - 10} textAnchor="middle" className={styles.tick}>
              {formatX(p.x)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
};
