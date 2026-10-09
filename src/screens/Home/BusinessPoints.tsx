import { Link } from "react-router-dom";
import logistics from "@/assets/ill/logistics_8vri.svg";
import budgeting from "@/assets/ill/budgeting_klon.svg";
import investing from "@/assets/ill/investing_uzcu.svg";
import type { NodeKey, SystemNode } from "./systemTypes";
import styles from "./BusinessPoints.module.css";

type Point = { n: number; title: string; lead: string; keys: NodeKey[]; img: string; alt: string };

const POINTS: Point[] = [
  {
    n: 1,
    title: "La mercancía: comprar, guardar y vender sin pérdidas",
    lead: "Cada compra entra con su lote y su vencimiento; la venta descuenta primero el lote que vence primero (FEFO) y el cupo del cliente se valida antes de fiar.",
    keys: ["proveedores", "bodega", "mostrador"],
    img: logistics,
    alt: "Ilustración de una persona organizando cajas en una bodega",
  },
  {
    n: 2,
    title: "El dinero: cartera y caja al día",
    lead: "El contado y los abonos llegan a la caja; la cartera vencida se ve a tiempo para cobrarla antes de que ahogue el flujo del mes.",
    keys: ["clientes", "caja"],
    img: budgeting,
    alt: "Ilustración de una persona revisando un presupuesto",
  },
  {
    n: 3,
    title: "La decisión: ¿conviene ampliar el local?",
    lead: "Los escenarios del crédito se evalúan con VPN, TIR y la cobertura de la cuota, usando las ventas reales que registra el sistema.",
    keys: ["ampliacion"],
    img: investing,
    alt: "Ilustración de una persona analizando una inversión",
  },
];

const TONE_LABEL = { good: "En orden", warn: "Atención", bad: "Crítico", neutral: "Informativo" } as const;

/**
 * Tres frentes del negocio, al estilo editorial agrotecnológico: título condensado centrado y puntos que alternan
 * texto e ilustración. Las cifras salen del modelo del sistema (reportes de la API, sin cálculos propios).
 */
export const BusinessPoints = ({ nodes }: { nodes: SystemNode[] }) => {
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  return (
    <section className={styles.section} aria-labelledby="frentes-titulo">
      <h2 id="frentes-titulo" className={styles.heading}>
        Tres frentes para leer el negocio
        <br />y decidir la ampliación
      </h2>
      {POINTS.map((p) => (
        <article key={p.n} className={[styles.point, p.n % 2 === 0 ? styles.reverse : ""].join(" ")}>
          <div className={styles.text}>
            <h3>
              Punto {p.n}: {p.title}
            </h3>
            <p className={styles.lead}>{p.lead}</p>
            <div className={styles.nodes}>
              {p.keys.map((k) => {
                const n = byKey.get(k);
                if (!n) return null;
                return (
                  <div key={k} className={styles.node}>
                    <div className={styles.nodeHead}>
                      <span className={styles.nodeTitle}>{n.title}</span>
                      <span className={[styles.tag, styles[`tone_${n.tone}`]].join(" ")}>{TONE_LABEL[n.tone]}</span>
                    </div>
                    {n.alert ? <div className={styles.alert}>{n.alert}</div> : null}
                    <dl className={styles.metrics}>
                      {n.metrics.slice(0, 3).map((m) => (
                        <div key={m.label}>
                          <dt>{m.label}</dt>
                          <dd>{m.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <Link to={n.path} className={styles.cta}>
                      {n.cta} →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={styles.art}>
            <img src={p.img} alt={p.alt} loading="lazy" />
          </div>
        </article>
      ))}
    </section>
  );
};
