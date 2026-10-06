import styles from "./charts.module.css";

export type DonutDatum = { label: string; value: number };

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

/** Dona de participación con total al centro y leyenda con porcentajes (máximo 6 porciones; el resto se agrupa). */
export const DonutChart = ({ data, format, centerLabel }: { data: DonutDatum[]; format: (v: number) => string; centerLabel: string }) => {
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const items = sorted.length > 6 ? [...sorted.slice(0, 5), { label: "Otras", value: sorted.slice(5).reduce((s, d) => s + d.value, 0) }] : sorted;
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const r = 62;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className={styles.donut}>
      <svg viewBox="0 0 160 160" className={styles.donutSvg} role="img" aria-label={items.map((d) => `${d.label} ${Math.round((d.value / total) * 100)} %`).join(", ")}>
        <circle cx="80" cy="80" r={r} className={styles.donutTrack} />
        {items.map((d, i) => {
          const len = (d.value / total) * c;
          const seg = (
            <circle
              key={d.label}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="20"
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
            />
          );
          offset += len;
          return seg;
        })}
        <text x="80" y="76" textAnchor="middle" className={styles.donutValue}>
          {format(total)}
        </text>
        <text x="80" y="94" textAnchor="middle" className={styles.donutLabel}>
          {centerLabel}
        </text>
      </svg>
      <ul className={styles.legend}>
        {items.map((d, i) => (
          <li key={d.label}>
            <i style={{ background: COLORS[i % COLORS.length] }} />
            <span className={styles.legendLabel}>{d.label}</span>
            <span className={styles.legendPct}>{Math.round((d.value / total) * 100)} %</span>
            <span className={styles.legendValue}>{format(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
