import type { ReactNode } from "react";
import styles from "./StatCard.module.css";

type Tone = "neutral" | "good" | "warn" | "bad";
type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  /** Trazos SVG de un ícono (viewBox 0 0 22 22). */
  icon?: string;
  /** Variación frente al periodo anterior, en fracción (0,12 = +12 %). */
  delta?: number | null;
  /** Serie corta para la minigráfica (tendencia). */
  spark?: number[];
};

const Spark = ({ values }: { values: number[] }) => {
  if (values.length < 2) return null;
  const w = 86;
  const h = 30;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg className={styles.spark} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path className={styles.area} d={`${line} L${w} ${h} L0 ${h} Z`} />
      <path className={styles.line} d={line} />
    </svg>
  );
};

const deltaText = (d: number) => `${d > 0 ? "▲" : d < 0 ? "▼" : "■"} ${Math.abs(d * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;

/** Tarjeta de indicador: ícono, etiqueta, variación, valor grande con minigráfica y nota; el tono pinta el filo izquierdo. */
export const StatCard = ({ label, value, hint, tone = "neutral", icon, delta, spark }: Props) => (
  <div className={[styles.card, styles[tone]].join(" ")}>
    <div className={styles.top}>
      {icon ? <span className={styles.icon}><svg viewBox="0 0 22 22" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} /></span> : null}
      <div className={styles.label}>{label}</div>
      {delta !== undefined && delta !== null && Number.isFinite(delta) ? (
        <span className={[styles.delta, delta > 0.0005 ? styles.up : delta < -0.0005 ? styles.down : styles.flat].join(" ")} title="Frente al periodo anterior">
          {deltaText(delta)}
        </span>
      ) : null}
    </div>
    <div className={styles.valueRow}>
      <div className={styles.value}>{value}</div>
      {spark ? <Spark values={spark} /> : null}
    </div>
    {hint !== undefined ? <div className={styles.hint}>{hint}</div> : null}
  </div>
);

export const StatGrid = ({ children }: { children: ReactNode }) => <div className={styles.grid}>{children}</div>;
