import { useWidth } from "./useWidth";
import styles from "./charts.module.css";

export type TornadoDatum = { label: string; low: number; high: number };

/** Diagrama de tornado: desviación del VPN respecto al caso base con la variable a −/+; dibujado al ancho real. */
export const TornadoChart = ({ data, base, format }: { data: TornadoDatum[]; base: number; format: (v: number) => string }) => {
  const [ref, width] = useWidth<HTMLDivElement>(560);
  const rowH = 30;
  const labelW = Math.min(190, width * 0.34);
  const height = data.length * rowH + 34;
  const maxDev = Math.max(...data.flatMap((d) => [Math.abs(d.low - base), Math.abs(d.high - base)]), 1);
  const cx = labelW + (width - labelW - 16) / 2;
  const scale = (width - labelW - 16) / 2 / maxDev;
  return (
    <div ref={ref} className={styles.wrap}>
      <svg className={styles.svg} width={width} height={height} role="img">
        {data.map((d, i) => {
          const y = i * rowH + 4;
          const lo = (d.low - base) * scale;
          const hi = (d.high - base) * scale;
          return (
            <g key={d.label}>
              <rect x={0} y={y - 2} width={width} height={rowH} className={i % 2 === 0 ? styles.stripe : styles.noStripe} />
              <text x={labelW - 10} y={y + 15} textAnchor="end" className={styles.tickStrong}>
                {d.label}
              </text>
              <rect x={Math.min(cx, cx + lo)} y={y + 3} width={Math.abs(lo)} height={rowH - 12} rx={3} className={styles.tornadoLow} />
              <rect x={Math.min(cx, cx + hi)} y={y + 3} width={Math.abs(hi)} height={rowH - 12} rx={3} className={styles.tornadoHigh} />
            </g>
          );
        })}
        <line x1={cx} x2={cx} y1={0} y2={data.length * rowH + 2} className={styles.axisStrong} />
        <text x={cx} y={data.length * rowH + 22} textAnchor="middle" className={styles.tick}>
          VPN base {format(base)}
        </text>
      </svg>
    </div>
  );
};
