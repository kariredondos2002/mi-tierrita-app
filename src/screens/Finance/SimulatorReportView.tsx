import type { ReactNode } from "react";
import { Badge, DataTable, type Column } from "@/components/ui";
import { LineChart, TornadoChart, VBarChart } from "@/components/charts";
import { dateOnly, int, money, moneyCompact, pct, times, todayIso, years } from "@/lib/format";
import { downloadXlsx, type XlsxSheet } from "@/lib/xlsx";
import { ROLE_LABELS, useSessionStore } from "@/stores/session";
import type { ExportData, SimulatorInput, SimulatorResult } from "@/types/api";
import { ReportPaper, type Indicator } from "@/screens/Reports/ReportPaper";
import { ReportPreview } from "@/screens/Reports/ReportPreview";
import { PaperBlock } from "@/screens/Reports/PaperBlock";
import { ratesNote } from "./ratesNote";
import { fileBase, points, signed } from "./simShared";
import styles from "@/screens/Reports/ReportsScreen.module.css";

export type SimulatorReportViewProps = { name: string; projectId: number | null; input: SimulatorInput; result: SimulatorResult; /** Selector de proyecto de la barra (solo en Reportes). */ selector?: ReactNode };

type Pair = [string, string];
const pairColumns: Column<Pair>[] = [
  { key: "k", header: "Concepto", render: (p) => p[0] },
  { key: "v", header: "Valor", align: "right", render: (p) => p[1] },
];
const PairTable = ({ rows }: { rows: Pair[] }) => <DataTable columns={pairColumns} rows={rows} rowKey={(p) => p[0]} scroll />;

/** Tabla de texto ya formateado (encabezados + celdas). */
const TextTable = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <DataTable
    columns={headers.map((h, i) => ({ key: String(i), header: h, align: i === 0 ? ("left" as const) : ("right" as const), render: (r: string[]) => r[i] ?? "" }))}
    rows={rows}
    rowKey={(r) => r.join("|")}
    scroll
  />
);

/** Las cifras del informe, armadas una sola vez para la hoja y el Excel (todas salen de `result`, que calcula la API). */
const sections = (input: SimulatorInput, r: SimulatorResult) => {
  const m = input.market;
  const assumptions: Pair[] = [
    ["Población objetivo", `${int(m.population)} personas`],
    ["Disposición a comprar", pct(m.purchaseIntent)],
    ["Consumo por persona", `${signed(m.consumptionPerPerson)} unidades al mes`],
    ["Crecimiento del PIB × sensibilidad", `${pct(m.gdpGrowth)} × ${signed(m.gdpSensitivity)}`],
    ["Variación del desempleo × sensibilidad", `${points(m.unemploymentChange)} × ${signed(m.unemploymentSensitivity)}`],
    ["Factor de conversión", signed(input.competition.conversionFactor)],
    ["Costo variable por unidad (año 1)", money(input.costs.variableUnitCost)],
    ["IPC", pct(input.costs.inflation)],
    ["Margen sobre el costo", pct(input.costs.marginOnCost)],
    ["Parte con crédito", pct(input.financing.creditPct)],
    ["Tasa del crédito", `${pct(input.financing.creditRateEA)} EA`],
    ["Plazo", `${int(input.financing.termMonths)} meses`],
    ["Tasa mínima exigida", `${pct(input.evaluation.discountRate)} EA`],
    ["Impuesto de renta", pct(input.evaluation.taxRate)],
    ["Horizonte", `${int(input.evaluation.horizonYears)} años`],
  ];
  const market: Pair[] = [
    ["Demanda mensual", `${int(r.market.monthlyDemand)} unidades`],
    ["Demanda anual", `${int(r.market.annualDemand)} unidades`],
    ["Crecimiento anual", `${pct(r.market.gdpTerm)} + ${pct(r.market.unemploymentTerm)} = ${pct(r.market.growth)}`],
    ...r.market.years.map((y): Pair => [`Demanda del mercado, año ${y.year}`, `${int(y.demand)} unidades`]),
  ];
  const competitors = {
    headers: ["Competidor", "Cuota", "Satisfacción", "Prob. de captar", "Aporte"],
    rows: [
      ...r.competition.competitors.map((c) => [c.name, pct(c.share), signed(c.satisfaction), pct(c.captureProbability), pct(c.contribution)]),
      ["Total captado", "", "", "", pct(r.competition.marketShare)],
    ],
    note: `${int(r.competition.monthlyUnits)} unidades al mes y ${int(r.competition.annualUnits)} al año. «Otros» (${pct(r.competition.othersShare)}) no aportan.`,
  };
  const costs = {
    headers: ["Concepto", ...r.costs.years.map((y) => `Año ${y.year}`)],
    rows: [
      ...(r.costs.years[0]?.fixedCosts ?? []).map((f, i) => [f.name, ...r.costs.years.map((y) => money(y.fixedCosts[i]?.amount))]),
      ["Costos fijos", ...r.costs.years.map((y) => money(y.fixedTotal))],
      ["Unidades vendidas", ...r.costs.years.map((y) => int(y.units))],
      ["Costo variable por unidad", ...r.costs.years.map((y) => money(y.variableUnitCost))],
      ["Costos variables", ...r.costs.years.map((y) => money(y.variableTotal))],
      ["Costo total", ...r.costs.years.map((y) => money(y.total))],
      ["Costo unitario", ...r.costs.years.map((y) => money(y.unitCost))],
    ],
    note: `Precio = ${money(r.costs.unitCost)} × (1 + ${pct(r.costs.marginOnCost)}) = ${money(r.costs.price)} (margen sobre el precio ${pct(r.costs.marginOnPrice)}, informativo). Desde el año 2 sube con el IPC.`,
  };
  const investment = {
    headers: ["Concepto", "Valor", "Parte"],
    rows: [...r.investment.items.map((i) => [i.label, money(i.amount), pct(i.share)]), ["Total", money(r.investment.total), pct(1)]],
  };
  const depreciation = {
    headers: ["Año", "Depreciación", "Amortización", "Cargo anual", "Valor neto activos", "Valor neto diferidos"],
    rows: r.investment.schedule.map((d) => [int(d.year), money(d.depreciation), money(d.amortization), money(d.charge), money(d.netBookValue), money(d.deferredNetValue)]),
  };
  const financingSummary: Pair[] = [
    ["Crédito", `${money(r.financing.credit)} (${pct(r.financing.debtRatio)})`],
    ["Aporte propio", `${money(r.financing.ownContribution)} (${pct(r.financing.equityRatio)})`],
    ["Tasa mensual", pct(r.financing.monthlyRate)],
    ["Cuota mensual fija", money(r.financing.installment)],
    ["Intereses totales", money(r.financing.totalInterest)],
    ["Cobertura mínima", r.financing.minCoverage === null ? "sin cuota" : times(r.financing.minCoverage)],
  ];
  const annual = {
    headers: ["Año", "Cuotas", "Intereses", "Abono a capital", "Saldo", "Flujo libre", "Cobertura"],
    rows: r.financing.annual.map((a) => {
      const c = r.financing.coverage[a.year - 1];
      return [int(a.year), money(a.installments), money(a.interest), money(a.principal), money(a.balance), c ? money(c.freeCashFlow) : "—", c?.coverage === null || c === undefined ? "—" : times(c.coverage)];
    }),
  };
  const monthly = {
    headers: ["Mes", "Cuota", "Interés", "Abono a capital", "Saldo"],
    rows: r.financing.monthly.map((x) => [int(x.month), money(x.installment), money(x.interest), money(x.principal), money(x.balance)]),
  };
  const flow = {
    headers: ["Concepto", "Año 0", ...r.cashFlow.years.map((y) => `Año ${y.year}`)],
    rows: [
      ["Unidades vendidas", "", ...r.cashFlow.years.map((y) => int(y.units))],
      ["Precio", "", ...r.cashFlow.years.map((y) => money(y.price))],
      ["Ingresos", "", ...r.cashFlow.years.map((y) => money(y.revenue))],
      ["EBITDA", "", ...r.cashFlow.years.map((y) => money(y.ebitda))],
      ["Depreciación y amortización", "", ...r.cashFlow.years.map((y) => money(y.depreciationAmortization))],
      ["Impuesto", "", ...r.cashFlow.years.map((y) => money(y.tax))],
      ["Flujo libre", "", ...r.cashFlow.years.map((y) => money(y.freeCashFlow))],
      ["Capital de trabajo y salvamento", "", ...r.cashFlow.years.map((y) => money(y.workingCapitalRecovery + y.salvage))],
      ["Flujo neto", money(r.cashFlow.flows[0]), ...r.cashFlow.years.map((y) => money(y.netFlow))],
    ],
  };
  const indicators: Pair[] = [
    ["VPN del proyecto", money(r.indicators.npv)],
    ["TIR", pct(r.indicators.irr)],
    ["Recuperación", years(r.indicators.paybackSimple)],
    ["Recuperación descontada", years(r.indicators.paybackDiscounted)],
    ["Beneficio / costo", times(r.indicators.benefitCostRatio)],
  ];
  const tornado = {
    headers: ["Variable", "Cambio", "VPN a la baja", "VPN al alza", "Amplitud"],
    rows: r.risks.tornado.map((t) => [t.label, t.change, money(t.npvLow), money(t.npvHigh), money(t.amplitude)]),
  };
  const scenarios = {
    headers: ["Escenario", "Demanda", "Precio", "VPN", "TIR", "Recuperación", "B/C"],
    rows: r.scenarios.map((s) => [s.label, pct(s.demandChange), pct(s.priceChange), money(s.npv), pct(s.irr), years(s.paybackSimple), times(s.benefitCostRatio)]),
  };
  return { assumptions, market, competitors, costs, investment, depreciation, financingSummary, annual, monthly, flow, indicators, tornado, scenarios };
};

const pairSheet = (name: string, rows: Pair[], title?: string[]): XlsxSheet => ({ name, ...(title ? { title } : {}), headers: ["Concepto", "Valor"], rows });
const textSheet = (name: string, t: { headers: string[]; rows: string[][] }, title?: string[]): XlsxSheet => ({ name, ...(title ? { title } : {}), headers: t.headers, rows: t.rows });

/**
 * Informe del simulador (R-04): el mismo documento que los reportes de ventas, inventario y cartera — vista previa con
 * barra de exportación, portada con folio y QR, hoja con conclusión, parámetros, indicadores, gráficos y tablas — y el
 * mismo Excel de seis secciones. Todas las cifras son las del cálculo de la API que muestra la pantalla de Finanzas.
 */
export const SimulatorReportView = ({ name, projectId, input, result, selector }: SimulatorReportViewProps) => {
  const user = useSessionStore((s) => s.user);
  const s = sections(input, result);
  const ind = result.indicators;
  const good = ind.npv >= 0;
  const notes = ratesNote(result);
  const today = dateOnly(todayIso());
  const byLine = user ? `Por ${user.firstName} ${user.lastName}, ${ROLE_LABELS[user.role]}` : "";
  const generated = user ? `Generado por ${user.firstName} ${user.lastName}, ${ROLE_LABELS[user.role]}, el ${today}` : `Generado el ${today}`;
  const verdict = `${good ? "El proyecto deja ganancia" : "El proyecto no alcanza la tasa mínima"}: VPN ${money(ind.npv)} al ${pct(ind.discountRate)}, TIR ${pct(ind.irr)}.`;
  const coverage = result.financing.minCoverage === null ? "sin cuota" : times(result.financing.minCoverage);
  const topRisk = result.risks.tornado[0];

  const exportFilters: ExportData = { projectId, proyecto: name.slice(0, 160) };

  const coverParams = [
    { label: "Proyecto", value: name },
    { label: "Inversión total", value: money(result.investment.total) },
    { label: "Financiación", value: `${pct(input.financing.creditPct)} con crédito a ${int(input.financing.termMonths)} meses` },
    { label: "Tasa mínima exigida", value: `${pct(ind.discountRate)} EA` },
    { label: "Horizonte", value: `${int(input.evaluation.horizonYears)} años` },
  ];

  const exportExcel = async (): Promise<boolean> => {
    const title = [`Agropecuaria Mi Tierrita · Informe del simulador financiero: ${name}`, verdict, generated];
    return downloadXlsx(`${fileBase(name)}.xlsx`, [
      pairSheet("1 Resumen y supuestos", [...s.indicators, ...s.assumptions], title),
      { name: "1 Tasas", headers: ["Por qué estas tasas"], rows: notes.map((n) => [n]) },
      pairSheet("2 Mercado", s.market),
      textSheet("2 Competencia", s.competitors),
      textSheet("3 Costos", s.costs),
      textSheet("3 Inversión", s.investment),
      textSheet("3 Depreciación", s.depreciation),
      pairSheet("4 Financiación", s.financingSummary),
      textSheet("4 Resumen anual", s.annual),
      textSheet("4 Amortización mensual", s.monthly),
      textSheet("5 Flujo de caja", s.flow),
      pairSheet("5 Indicadores", s.indicators),
      textSheet("6 Tornado", s.tornado),
      textSheet("6 Escenarios", s.scenarios),
    ]);
  };

  const ledger: Indicator[] = [
    { label: "Inversión total", value: money(result.investment.total) },
    { label: "VPN del proyecto", value: money(ind.npv), tone: good ? "good" : "bad" },
    { label: "TIR", value: pct(ind.irr) },
    { label: "Recuperación", value: years(ind.paybackSimple) },
    { label: "Recuperación descontada", value: years(ind.paybackDiscounted) },
    { label: "Beneficio / costo", value: times(ind.benefitCostRatio) },
    { label: "Precio de venta", value: money(result.costs.price) },
    { label: "Unidades al año (año 1)", value: int(result.competition.annualUnits) },
    { label: "Cuota mensual", value: money(result.financing.installment) },
    { label: "Cobertura mínima", value: coverage, ...(result.financing.coverageAlert ? { tone: "bad" as const } : {}) },
  ];

  const filtersBar = (
    <div className={styles.chipsRow}>
      <span className={styles.filterLabel}>Proyecto</span>
      {selector ?? <Badge tone="good">{name}</Badge>}
      <span className={styles.filterHint}>cifras de ejemplo de la ampliación, no del negocio real</span>
    </div>
  );

  const balancePoints = [{ x: 0, y: result.financing.credit }, ...result.financing.annual.map((a) => ({ x: a.year, y: a.balance }))];

  return (
    <ReportPreview
      subtitle={`Informe del simulador financiero · ${name} · generado el ${today}`}
      filters={filtersBar}
      exportName={fileBase(name)}
      onExcel={exportExcel}
      record={{
        report: "scenario",
        description: `Simulador · ${name}`.slice(0, 200),
        filters: exportFilters,
        summary: { npv: ind.npv, irr: ind.irr, paybackSimple: ind.paybackSimple, benefitCostRatio: ind.benefitCostRatio, price: result.costs.price, growth: result.market.growth },
      }}
      cover={{ code: "R-04", title: "Informe del", accent: "simulador financiero", period: `${name} · horizonte de ${int(input.evaluation.horizonYears)} años · corte al ${today}`, params: coverParams }}
    >
      <ReportPaper
        code="R-04"
        title="Informe del"
        accent="simulador financiero"
        meta={[`Proyecto: ${name}`, `Corte al ${today}`, "Ampliación del local · cifras de ejemplo, no del negocio real", byLine]}
        summary={
          <>
            <p>
              <strong>{verdict}</strong> Inversión de {money(result.investment.total)}, {pct(input.financing.creditPct)} con crédito a {int(input.financing.termMonths)} meses; precio de{" "}
              {money(result.costs.price)} y {int(result.competition.annualUnits)} unidades el primer año.
            </p>
            <p>
              La cuota mensual es de {money(result.financing.installment)} y la cobertura mínima de la cuota con el flujo libre es {coverage}
              {result.financing.coverageAlert ? ": el flujo de algún año no alcanza a cubrirla." : "."}
              {topRisk ? ` Lo que más mueve el VPN es ${topRisk.label.toLowerCase()}.` : ""}
            </p>
            {notes.map((n) => (
              <p key={n.slice(0, 24)}>{n}</p>
            ))}
          </>
        }
        params={s.assumptions.map(([label, value]) => ({ label, value }))}
        indicators={ledger}
        note="Cifras calculadas por el servidor con los supuestos del proyecto; son las mismas de la pantalla. Es un apoyo para decidir, no un concepto financiero."
      >
        <PaperBlock label="1. Resumen y supuestos" hint="Fuente: indicadores y supuestos del proyecto">
          <PairTable rows={[...s.indicators, ...s.assumptions]} />
        </PaperBlock>
        <PaperBlock label="2. Mercado y competencia" hint={s.competitors.note}>
          <PairTable rows={s.market} />
          <TextTable headers={s.competitors.headers} rows={s.competitors.rows} />
        </PaperBlock>
        <PaperBlock label="3. Costos e inversión" hint={s.costs.note}>
          <TextTable headers={s.costs.headers} rows={s.costs.rows} />
          <TextTable headers={s.investment.headers} rows={s.investment.rows} />
          <TextTable headers={s.depreciation.headers} rows={s.depreciation.rows} />
        </PaperBlock>
        <PaperBlock label="4. Financiación y amortización" hint="saldo del crédito al cierre de cada año">
          <LineChart points={balancePoints} formatX={(v) => `Año ${int(v)}`} formatY={moneyCompact} title="Saldo del crédito por año" />
          <p className={styles.chartNote}>Fuente: tabla de amortización de la API (resumen anual).</p>
          <PairTable rows={s.financingSummary} />
          <TextTable headers={s.annual.headers} rows={s.annual.rows} />
          <TextTable headers={s.monthly.headers} rows={s.monthly.rows} />
        </PaperBlock>
        <PaperBlock label="5. Flujo de caja e indicadores" hint="flujo neto de cada año; el año 0 es la inversión propia">
          <VBarChart data={result.cashFlow.flows.map((v, i) => ({ label: `Año ${i}`, value: v, alt: v < 0 }))} format={moneyCompact} formatTip={money} title="Flujo neto por año" />
          <p className={styles.chartNote}>Fuente: flujo de caja del proyecto; las barras naranja son flujos negativos.</p>
          <TextTable headers={s.flow.headers} rows={s.flow.rows} />
          <PairTable rows={s.indicators} />
        </PaperBlock>
        <PaperBlock label="6. Riesgos y escenarios" hint={`VPN base ${moneyCompact(result.risks.baseNpv)}`}>
          <TornadoChart data={result.risks.tornado.map((t) => ({ label: `${t.label} ${t.change}`, low: t.npvLow, high: t.npvHigh }))} base={result.risks.baseNpv} format={moneyCompact} />
          <p className={styles.chartNote}>Fuente: cada variable se mueve por separado y las demás quedan fijas.</p>
          <TextTable headers={s.tornado.headers} rows={s.tornado.rows} />
          <TextTable headers={s.scenarios.headers} rows={s.scenarios.rows} />
        </PaperBlock>
      </ReportPaper>
    </ReportPreview>
  );
};
