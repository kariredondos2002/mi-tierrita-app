import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, Card, EmptyState, QueryState, StatCard, StatGrid } from "@/components/ui";
import { DonutChart, HBarChart, TrendChart } from "@/components/charts";
import { useInventoryReport, useReceivablesReport, useSalesReport } from "@/hooks/reports";
import { useScenarios } from "@/hooks/financial";
import { useSuppliers } from "@/hooks/suppliers";
import { useMemo } from "react";
import { BusinessPoints } from "./BusinessPoints";
import { buildSystemModel } from "./systemModel";
import { NAV_ICONS } from "@/router/navigation";
import { addDaysIso, dateOnly, int, money, moneyAxis, moneyCompact, shortDate, todayIso } from "@/lib/format";
import type { SalesReportDayRow, SalesReportProductRow, User } from "@/types/api";
import { AttentionCard } from "./AttentionCard";
import { DecisionCard } from "./DecisionCard";
import { ReceivablesCard } from "./ReceivablesCard";
import { greetingFor, monthCloseLine, monthName } from "./homeDates";
import { HomeCarousel } from "./HomeCarousel";
import styles from "./HomeScreen.module.css";

const ICON_CASH = '<rect x="2.5" y="5.5" width="17" height="11" rx="2"/><circle cx="11" cy="11" r="2.6"/><path d="M5.5 8.5v5M16.5 8.5v5"/>';
const ICON_ALERT = '<path d="M11 3.2 L19.5 18 H2.5 Z"/><line x1="11" y1="9" x2="11" y2="12.6"/><circle cx="11" cy="15.2" r="0.6" fill="currentColor"/>';

/** Agrupa los días del reporte en semanas (lunes) solo para dibujar la tendencia; los totales vienen de la API. */
const weekly = (rows: SalesReportDayRow[]) => {
  const map = new Map<string, number>();
  for (const r of rows) {
    const [y, m, d] = r.date.slice(0, 10).split("-").map(Number) as [number, number, number];
    const date = new Date(y, m - 1, d);
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + r.total);
  }
  return [...map].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total }));
};

/** Tablero gerencial del administrador (SIG + BI + DSS): indicadores con tendencia, ventas, mezcla del inventario, cartera y la decisión abierta. */
export const AdminHome = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const today = todayIso();
  const monthStart = `${today.slice(0, 7)}-01`;
  const dayOfMonth = Number(today.slice(8, 10));
  const prevStart = (() => {
    const d = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const prevSameDay = addDaysIso(prevStart, dayOfMonth - 1);
  const sales = useSalesReport({ from: monthStart, to: today, groupBy: "product" });
  const prevSales = useSalesReport({ from: prevStart, to: prevSameDay, groupBy: "day" });
  // 13 semanas completas (lunes a domingo) que terminan el domingo pasado: la semana en curso no se mezcla
  const lastSunday = addDaysIso(today, -((new Date().getDay() + 7) % 7 || 7));
  const trendFrom = addDaysIso(lastSunday, -90);
  const trend = useSalesReport({ from: trendFrom, to: lastSunday, groupBy: "day" });
  const receivables = useReceivablesReport();
  const inventory = useInventoryReport();
  const scenarios = useScenarios({ limit: 1 });
  const allScenarios = useScenarios();
  const suppliers = useSuppliers({ limit: 1, active: true });
  const model = useMemo(
    () =>
      buildSystemModel({
        sales: sales.data,
        inventory: inventory.data,
        receivables: receivables.data,
        scenarios: allScenarios.data?.items,
        suppliers: suppliers.data?.count,
      }),
    [sales.data, inventory.data, receivables.data, allScenarios.data, suppliers.data],
  );

  const days = (trend.data?.rows ?? []) as SalesReportDayRow[];
  const weeks = weekly(days);
  const last14 = days.slice(-14).map((d) => d.total);
  const delta = sales.data && prevSales.data && prevSales.data.total > 0 ? sales.data.total / prevSales.data.total - 1 : null;
  const ticketDelta =
    sales.data && prevSales.data && sales.data.salesCount > 0 && prevSales.data.salesCount > 0
      ? sales.data.total / sales.data.salesCount / (prevSales.data.total / prevSales.data.salesCount) - 1
      : null;

  return (
    <>
      <PageHeader
        eyebrow="Tablero gerencial"
        title={greetingFor(user.firstName)}
        subtitle={monthCloseLine()}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/reportes")}>
              Reportes gerenciales
            </Button>
            <Button onClick={() => navigate("/ventas/nueva")}>+ Nueva venta</Button>
          </>
        }
      />

      <StatGrid>
        <StatCard
          icon={ICON_CASH}
          label={`Ventas de ${monthName().toLowerCase()}`}
          value={sales.isPending ? "…" : sales.data ? moneyCompact(sales.data.total) : "—"}
          delta={delta}
          spark={last14.length > 1 ? last14 : undefined}
          hint={sales.data ? `${int(sales.data.salesCount)} ventas · vs. mismo corte del mes anterior` : "Cargando"}
        />
        <StatCard
          icon={NAV_ICONS.sales}
          label="Ticket promedio"
          value={sales.data && sales.data.salesCount > 0 ? moneyCompact(sales.data.total / sales.data.salesCount) : sales.isPending ? "…" : "—"}
          delta={ticketDelta}
          hint={sales.data ? `${int(sales.data.units)} unidades vendidas en el mes` : "Cargando"}
        />
        <StatCard
          icon={NAV_ICONS.inventory}
          label="Inventario a costo"
          value={inventory.isPending ? "…" : inventory.data ? moneyCompact(inventory.data.costValue) : "—"}
          hint={inventory.data ? `${int(inventory.data.activeProducts)} productos · ${moneyCompact(inventory.data.saleValue)} a precio de venta` : "Cargando"}
        />
        <StatCard
          icon={ICON_ALERT}
          label="Cartera vencida"
          value={receivables.isPending ? "…" : receivables.data ? moneyCompact(receivables.data.overdueBalance) : "—"}
          tone={receivables.data && receivables.data.overdueBalance > 0 ? "warn" : "good"}
          hint={receivables.data ? `${int(receivables.data.overdueCustomers)} de ${int(receivables.data.customersWithBalance)} clientes con saldo · más de ${receivables.data.overdueDays} días` : "Cargando"}
        />
      </StatGrid>

      <HomeCarousel role="ADMIN" />

      <BusinessPoints nodes={model.nodes} />

      <div className={styles.grid}>
        <Card title="Ventas de las últimas 13 semanas" subtitle={`Total semanal en pesos, hasta el domingo ${shortDate(lastSunday)} · pase el cursor para ver cada semana`} actions={<Button size="sm" variant="ghost" onClick={() => navigate("/reportes")}>Ver detalle →</Button>}>
          <QueryState query={trend} isEmpty={(r) => r.rows.length === 0} empty={<EmptyState title="Aún no hay ventas" text="La tendencia aparece con la primera semana de ventas." />}>
            {(r) => (
              <>
                <TrendChart data={weeks.map((w) => ({ label: shortDate(w.date), value: w.total }))} format={moneyAxis} formatTip={money} names={["Ventas de la semana"]} />
                <div className={styles.trendFoot}>
                  <span>
                    <strong>{moneyCompact(r.total)}</strong> en 13 semanas
                  </span>
                  <span>
                    <strong>{moneyCompact(r.cashTotal)}</strong> de contado
                  </span>
                  <span>
                    <strong>{moneyCompact(r.creditTotal)}</strong> a crédito
                  </span>
                  <span>
                    <strong>{int(r.salesCount)}</strong> ventas
                  </span>
                </div>
              </>
            )}
          </QueryState>
        </Card>
        <div className={styles.column}>
          <DecisionCard query={scenarios} />
          <AttentionCard inventory={inventory} receivables={receivables} />
        </div>
      </div>

      <div className={styles.grid3}>
        <Card title="Productos más vendidos" subtitle={`${monthName()} · en pesos`}>
          <QueryState
            query={sales}
            isEmpty={(r) => r.rows.length === 0}
            empty={
              <EmptyState
                title="Sin ventas este mes"
                text="Las ventas registradas aparecerán aquí por producto."
                action={
                  <Button size="sm" onClick={() => navigate("/ventas/nueva")}>
                    Registrar la primera venta
                  </Button>
                }
              />
            }
          >
            {(report) => {
              const rows = report.rows.filter((r): r is SalesReportProductRow => "productId" in r);
              const top = [...rows].sort((a, b) => b.total - a.total).slice(0, 6);
              return <HBarChart data={top.map((r) => ({ label: r.productName, value: r.total }))} format={moneyCompact} />;
            }}
          </QueryState>
        </Card>
        <Card title="Capital en bodega por línea" subtitle={inventory.data ? `A costo · corte ${dateOnly(inventory.data.asOf)}` : "A costo"}>
          <QueryState query={inventory} isEmpty={(r) => r.byCategory.length === 0} empty={<EmptyState title="Sin inventario" text="Registre lotes para ver la mezcla por línea." />}>
            {(r) => <DonutChart data={r.byCategory.map((c) => ({ label: c.categoryName, value: c.costValue }))} format={moneyCompact} centerLabel="a costo" />}
          </QueryState>
        </Card>
        <ReceivablesCard query={receivables} />
      </div>
    </>
  );
};
