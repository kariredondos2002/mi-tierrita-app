import { Link } from "react-router-dom";
import { Badge, Card } from "@/components/ui";
import { useInventoryReport, useSalesReport } from "@/hooks/reports";
import { addDaysIso, int, money, moneyCompact, pct, todayIso, years } from "@/lib/format";
import type { ScenarioDetail } from "@/types/api";
import styles from "./ProjectStudyPanel.module.css";

const STEP_ICONS = {
  innovation: '<path d="M11 2.8a6 6 0 0 0-3.6 10.8V16h7.2v-2.4A6 6 0 0 0 11 2.8z"/><path d="M8.6 19h4.8"/>',
  market: '<path d="M3 18V9M8 18V5M13 18v-7M18 18V3"/>',
  technical: '<path d="M3 19h16"/><path d="M5 19V9l6-4 6 4v10"/><rect x="9" y="12" width="4" height="7"/>',
  financial: '<path d="M3 15 L8 9 L12.5 12.5 L19 5"/><path d="M14 5h5v5"/>',
} as const;

const Icon = ({ paths }: { paths: string }) => <svg viewBox="0 0 22 22" aria-hidden="true" dangerouslySetInnerHTML={{ __html: paths }} />;

/**
 * Estudio del proyecto (TCC de Ingeniería Económica): articula los cuatro componentes de la formulación —
 * innovación, mercado, técnico y financiero— sobre los supuestos guardados del escenario y los datos reales
 * de ventas e inventario que registra el SIG. No calcula indicadores: los muestra tal como los devuelve la API.
 */
export const ProjectStudyPanel = ({ scenario }: { scenario: ScenarioDetail }) => {
  const a = scenario.assumptions;
  const r = scenario.results;
  const today = todayIso();
  const sales90 = useSalesReport({ from: addDaysIso(today, -90), to: today, groupBy: "day" });
  const inventory = useInventoryReport();
  const observedMonthly = sales90.data ? (sales90.data.total / 90) * 30 : null;
  const conclusion = r.npv >= 0 ? "good" : "bad";

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <div>
          <span className={styles.kicker}>Proyecto de inversión · Ingeniería Económica</span>
          <h2 className={styles.heroTitle}>Ampliación del local de Agropecuaria Mi Tierrita</h2>
          <p className={styles.heroText}>
            La herramienta resuelve <strong>si conviene financiar con crédito la ampliación del local</strong> de una agropecuaria real de Sahagún (Córdoba), y cualquier comercio
            agropecuario similar puede usarla para la misma decisión: cargar sus supuestos, comparar alternativas de financiación y leer el resultado.
          </p>
        </div>
        <div className={styles.flow} aria-label="Ruta de la formulación">
          {[
            ["innovation", "Innovación"],
            ["market", "Mercado"],
            ["technical", "Técnico"],
            ["financial", "Financiero"],
          ].map(([k, label], i) => (
            <a key={k} href={`#${k}`} className={styles.flowStep}>
              <span className={styles.flowIcon}>
                <Icon paths={STEP_ICONS[k as keyof typeof STEP_ICONS]} />
              </span>
              <span className={styles.flowNum}>0{i + 1}</span>
              <span className={styles.flowLabel}>{label}</span>
            </a>
          ))}
        </div>
      </section>

      <div className={styles.grid}>
        <Card className={styles.block} title="1 · Innovación" subtitle="Qué cambia en el negocio">
          <span id="innovation" />
          <ul className={styles.list}>
            <li>Pasa del cuaderno y la memoria del administrador a un <strong>sistema de información gerencial</strong> con inventario por lotes, ventas y cartera en línea.</li>
            <li>El inventario sale por <strong>FEFO</strong> (primero en vencer, primero en salir): reduce pérdidas por vencimiento en medicina veterinaria y alimento.</li>
            <li>La decisión de ampliar deja de ser intuitiva: se apoya en un <strong>modelo de evaluación con VPN, TIR, sensibilidad y tornado</strong> que la gerencia puede repetir.</li>
            <li>Tipo de innovación: de proceso (gestión) y organizacional, de bajo costo y replicable en otros comercios agropecuarios.</li>
          </ul>
        </Card>

        <Card className={styles.block} title="2 · Estudio de mercado" subtitle="Demanda que justifica crecer">
          <span id="market" />
          <div className={styles.kpis}>
            <div>
              <span>Ventas mensuales del caso base</span>
              <strong>{moneyCompact(a.monthlySales)}</strong>
            </div>
            <div>
              <span>Registradas en el SIG (promedio 90 días)</span>
              <strong>{observedMonthly === null ? "…" : moneyCompact(observedMonthly)}</strong>
            </div>
            <div>
              <span>Aumento esperado con la ampliación</span>
              <strong>{pct(scenario.salesIncrease)}</strong>
            </div>
            <div>
              <span>Crecimiento base anual</span>
              <strong>{pct(a.baseSalesGrowth)}</strong>
            </div>
          </div>
          <p className={styles.note}>
            Mercado objetivo: fincas, granjas avícolas y porcícolas y clientes de mostrador de Sahagún y su zona rural. El SIG registra {sales90.data ? int(sales90.data.salesCount) : "…"} ventas en
            los últimos 90 días ({sales90.data ? pct(sales90.data.creditTotal / Math.max(sales90.data.total, 1)) : "…"} a crédito), base para validar el supuesto de demanda.
          </p>
        </Card>

        <Card className={styles.block} title="3 · Estudio técnico" subtitle="Qué se construye y qué se necesita">
          <span id="technical" />
          <table className={styles.table}>
            <tbody>
              <tr>
                <td>Obra civil (ampliación del local)</td>
                <td>{money(a.constructionInvestment)}</td>
              </tr>
              <tr>
                <td>Dotación (estantería, equipos)</td>
                <td>{money(a.equipmentInvestment)}</td>
              </tr>
              <tr>
                <td>Capital de trabajo (inventario adicional)</td>
                <td>{money(r.workingCapital)}</td>
              </tr>
              <tr className={styles.total}>
                <td>Inversión total</td>
                <td>{money(r.totalInvestment)}</td>
              </tr>
              <tr>
                <td>Gastos fijos adicionales por mes</td>
                <td>{money(scenario.additionalExpensesMonth)}</td>
              </tr>
              <tr>
                <td>Rotación del inventario</td>
                <td>{a.inventoryTurnover} veces al año</td>
              </tr>
            </tbody>
          </table>
          <p className={styles.note}>
            Capital hoy en bodega según el SIG: {inventory.data ? moneyCompact(inventory.data.costValue) : "…"} a costo en {inventory.data ? int(inventory.data.activeProducts) : "…"} productos.
          </p>
        </Card>

        <Card className={styles.block} title="4 · Estudio financiero" subtitle={scenario.name}>
          <span id="financial" />
          <div className={styles.kpis}>
            <div>
              <span>VPN a TMAR {pct(a.tmarEA)}</span>
              <strong className={r.npv >= 0 ? styles.good : styles.bad}>{moneyCompact(r.npv)}</strong>
            </div>
            <div>
              <span>TIR del proyecto</span>
              <strong>{pct(r.irr)}</strong>
            </div>
            <div>
              <span>Recuperación descontada</span>
              <strong>{years(r.paybackDiscounted)}</strong>
            </div>
            <div>
              <span>Relación beneficio / costo</span>
              <strong>{r.benefitCostRatio.toLocaleString("es-CO", { maximumFractionDigits: 2 })}</strong>
            </div>
          </div>
          <p className={styles.note}>
            Crédito de {moneyCompact(r.credit)} al {pct(a.creditRateEA)} EA a {scenario.termMonths} meses · cuota {money(r.installment)} · horizonte {a.horizonYears} años · inflación {pct(a.inflation)} ·
            salvamento {pct(a.salvageValuePct)}.
          </p>
        </Card>
      </div>

      <section className={[styles.verdict, styles[conclusion]].join(" ")}>
        <Badge tone={conclusion}>{r.npv >= 0 ? "Conviene" : "No conviene"}</Badge>
        <p>
          Con los supuestos de «{scenario.name}», la ampliación {r.npv >= 0 ? "crea" : "destruye"} valor: VPN de {money(r.npv)} y TIR de {pct(r.irr)} frente a una TMAR de {pct(a.tmarEA)}.{" "}
          <Link to={`/finanzas/escenarios?escenario=${scenario.id}`}>Comparar alternativas y sensibilidad →</Link>
        </p>
      </section>
    </div>
  );
};
