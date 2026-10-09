import type { NodeKey, SystemFlow, SystemNode, Tone } from "./systemTypes";
import { int, moneyCompact, pct, times } from "@/lib/format";
import type { InventoryReport, ReceivablesReport, SalesReport, ScenarioSummary } from "@/types/api";

export type SystemInputs = {
  sales?: SalesReport;
  inventory?: InventoryReport;
  receivables?: ReceivablesReport;
  scenarios?: ScenarioSummary[];
  suppliers?: number;
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Escenario que el mapa muestra para la ampliación: el que crea valor y mejor cubre su cuota.
 * Si ninguno crea valor, el más reciente. Es una lectura de los indicadores que calcula la API.
 */
export const bestScenario = (items: ScenarioSummary[] = []): ScenarioSummary | undefined => {
  const viable = items.filter((s) => s.indicators.npv > 0);
  if (viable.length > 0) return [...viable].sort((a, b) => (b.indicators.coverageIncremental ?? 0) - (a.indicators.coverageIncremental ?? 0))[0];
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
};

/** Orden del recorrido guiado: sigue la mercancía y luego el dinero hasta la decisión. */
export const TOUR: NodeKey[] = ["sig", "proveedores", "bodega", "mostrador", "clientes", "caja", "ampliacion"];

/** Convierte los reportes de la API en los nodos y flujos del mapa vivo (la interfaz no calcula indicadores). */
export const buildSystemModel = ({ sales, inventory, receivables, scenarios, suppliers }: SystemInputs): { nodes: SystemNode[]; flows: SystemFlow[] } => {
  const expired = inventory?.expired.batches ?? 0;
  const expiring = inventory?.expiringSoon.batches ?? 0;
  const out = inventory?.outOfStock ?? 0;
  const bodegaTone: Tone = expired > 0 ? "bad" : expiring > 0 || out > 0 ? "warn" : "good";
  const bodegaAlert = expired > 0 ? `${int(expired)} ${expired === 1 ? "lote vencido" : "lotes vencidos"} en el estante` : expiring > 0 ? `${int(expiring)} lotes vencen en ${inventory?.expiringDays ?? 30} días` : undefined;

  const overdue = receivables?.overdueCustomers ?? 0;
  const overdueShare = receivables && receivables.totalBalance > 0 ? receivables.overdueBalance / receivables.totalBalance : 0;
  const clientesTone: Tone = overdue === 0 ? "good" : overdueShare > 0.1 ? "bad" : "warn";

  const best = bestScenario(scenarios);
  const ind = best?.indicators;
  const cov = ind?.coverageIncremental ?? null;
  const ampTone: Tone = !ind ? "neutral" : ind.npv <= 0 ? "bad" : cov !== null && cov >= 1.2 ? "good" : "warn";

  const salesCount = sales?.salesCount ?? 0;
  const total = sales?.total ?? 0;
  const cashShare = total > 0 ? (sales?.cashTotal ?? 0) / total : 0.5;

  const nodes: SystemNode[] = [
    {
      key: "sig",
      title: "SIG Mi Tierrita",
      layer: "SIG",
      role: "Recibe cada venta, compra y abono, y la convierte en indicadores, alertas y escenarios. Cada operación queda con usuario y fecha.",
      metrics: [
        { label: "Puntos conectados", value: "6 procesos" },
        { label: "Roles", value: "Administrador · Ventas · Bodega" },
        { label: "Trazabilidad", value: "100 % auditado" },
      ],
      tone: "neutral",
      path: "/reportes",
      cta: "Ver reportes gerenciales",
      level: 0.6,
    },
    {
      key: "proveedores",
      title: "Proveedores",
      layer: "ERP",
      role: "Entra la mercancía. Cada compra crea un lote con costo y fecha de vencimiento.",
      metrics: [
        { label: "Proveedores activos", value: suppliers === undefined ? "…" : int(suppliers) },
        { label: "Riesgo", value: "Retrasos en temporada de siembra" },
      ],
      tone: "neutral",
      path: "/proveedores",
      cta: "Ir a proveedores",
      level: 0.5,
    },
    {
      key: "bodega",
      title: "Bodega y lotes",
      layer: "ERP",
      role: "La mercancía espera en el estante. Sale primero el lote que vence primero (FEFO).",
      metrics: [
        { label: "Capital en bodega", value: inventory ? moneyCompact(inventory.costValue) : "…" },
        { label: "Lotes vencidos", value: inventory ? int(expired) : "…" },
        { label: `Vencen en ${inventory?.expiringDays ?? 30} días`, value: inventory ? int(expiring) : "…" },
        { label: "Sin existencias", value: inventory ? int(out) : "…" },
      ],
      tone: bodegaTone,
      alert: bodegaAlert,
      path: "/lotes",
      cta: "Revisar lotes",
      level: clamp((inventory?.costValue ?? 0) / 150_000_000),
      count: Math.max(3, Math.min(9, inventory?.byCategory.length ? inventory.byCategory.length + 3 : 6)),
      critical: Math.min(3, expired),
    },
    {
      key: "mostrador",
      title: "Mostrador y ventas",
      layer: "ERP",
      role: "Se vende de contado o a crédito. El sistema valida el cupo y descuenta los lotes.",
      metrics: [
        { label: "Ventas del mes", value: sales ? moneyCompact(total) : "…" },
        { label: "Número de ventas", value: sales ? int(salesCount) : "…" },
        { label: "Ticket promedio", value: sales && salesCount > 0 ? moneyCompact(total / salesCount) : "—" },
      ],
      tone: "good",
      path: "/ventas",
      cta: "Ir al punto de venta",
      level: clamp(salesCount / 300),
    },
    {
      key: "clientes",
      title: "Clientes y cartera",
      layer: "ERP",
      role: "Los clientes a crédito pagan con abonos. La cartera vencida presiona la caja.",
      metrics: [
        { label: "Clientes con saldo", value: receivables ? int(receivables.customersWithBalance) : "…" },
        { label: "Cartera total", value: receivables ? moneyCompact(receivables.totalBalance) : "…" },
        { label: "Cartera vencida", value: receivables ? `${moneyCompact(receivables.overdueBalance)} · ${int(overdue)} clientes` : "…" },
      ],
      tone: clientesTone,
      alert: overdue > 0 ? `${int(overdue)} ${overdue === 1 ? "cliente en mora" : "clientes en mora"}` : undefined,
      path: "/clientes",
      cta: "Ver cartera",
      level: clamp((receivables?.totalBalance ?? 0) / 20_000_000),
      count: Math.max(3, Math.min(9, receivables?.customersWithBalance ?? 6)),
      critical: Math.min(9, overdue),
    },
    {
      key: "caja",
      title: "Caja y resultados",
      layer: "BI",
      role: "Aquí llega el dinero: contado del mostrador y abonos de la cartera. Es la base de la decisión.",
      metrics: [
        { label: "De contado", value: sales ? moneyCompact(sales.cashTotal) : "…" },
        { label: "A crédito", value: sales ? moneyCompact(sales.creditTotal) : "…" },
        { label: "Proporción de contado", value: sales ? pct(cashShare) : "…" },
      ],
      tone: "good",
      path: "/reportes",
      cta: "Ver reportes",
      level: clamp(total / 80_000_000),
    },
    {
      key: "ampliacion",
      title: "Ampliación del local",
      layer: "DSS",
      role: best ? `Escenario con mejor cobertura: ${best.name}.` : "Aún no hay escenarios evaluados.",
      metrics: ind
        ? [
            { label: "Valor presente neto", value: moneyCompact(ind.npv) },
            { label: "La ampliación paga su cuota", value: times(cov) },
            { label: "Cuota mensual", value: moneyCompact(ind.installment) },
          ]
        : [{ label: "Escenarios", value: "Ninguno todavía" }],
      tone: ampTone,
      alert: ind && ind.npv <= 0 ? "Con estas cifras no conviene" : undefined,
      path: "/finanzas",
      cta: "Abrir el panel de decisión",
      level: ind ? clamp(ind.npv / 20_000_000) : 0.2,
    },
  ];

  const goods = clamp(0.3 + salesCount / 400);
  const flows: SystemFlow[] = [
    { from: "proveedores", to: "bodega", kind: "mercancia", label: "Compras con lote y vencimiento", intensity: goods * 0.8 },
    { from: "bodega", to: "mostrador", kind: "mercancia", label: "Salida FEFO", intensity: goods },
    { from: "mostrador", to: "clientes", kind: "mercancia", label: "Ventas entregadas", intensity: goods },
    { from: "mostrador", to: "caja", kind: "dinero", label: "Ventas de contado", intensity: clamp(cashShare) },
    { from: "clientes", to: "caja", kind: "dinero", label: "Abonos de cartera", intensity: clamp(1 - cashShare) },
    { from: "caja", to: "proveedores", kind: "dinero", label: "Pago a proveedores", intensity: 0.45 },
    { from: "sig", to: "ampliacion", kind: "informacion", label: "Escenarios e indicadores", intensity: 0.5 },
    { from: "bodega", to: "sig", kind: "informacion", label: "Lotes y existencias", intensity: 0.35 },
    { from: "mostrador", to: "sig", kind: "informacion", label: "Ventas registradas", intensity: 0.35 },
    { from: "clientes", to: "sig", kind: "informacion", label: "Saldos y mora", intensity: 0.35 },
    { from: "caja", to: "sig", kind: "informacion", label: "Resultados del mes", intensity: 0.35 },
  ];
  return { nodes, flows };
};
