import { useState } from "react";
import { useExportHistory } from "@/hooks/reports";
import { Card, DataTable, EmptyState, Pagination, QueryState, type Column } from "@/components/ui";
import { dateTime } from "@/lib/format";
import type { Audit } from "@/types/api";
import styles from "./ReportsScreen.module.css";

/** «Reporte de ventas · PDF · 2026-09-10 a 2026-10-09 · por día» → partes legibles. */
export const splitExportDetail = (detail: string | null | undefined): { report: string; format: "PDF" | "XLSX" | "—"; filters: string } => {
  const parts = (detail ?? "").split(" · ");
  const fmt = parts[1]?.toUpperCase();
  return {
    report: parts[0] || "Reporte",
    format: fmt === "PDF" || fmt === "XLSX" ? fmt : "—",
    filters: parts.slice(2).join(" · "),
  };
};

const columns: Column<Audit>[] = [
  { key: "createdAt", header: "Fecha y hora", render: (r) => dateTime(r.createdAt), width: "170px" },
  { key: "who", header: "Generado por", render: (r) => <span className={styles.name}>@{r.username}</span> },
  {
    key: "report",
    header: "Reporte",
    render: (r) => {
      const d = splitExportDetail(r.detail);
      return (
        <span className={styles.historyWho}>
          <span className={styles.name}>{d.report}</span>
          {d.filters ? <small>{d.filters}</small> : null}
        </span>
      );
    },
  },
  {
    key: "format",
    header: "Formato",
    render: (r) => {
      const f = splitExportDetail(r.detail).format;
      return <span className={[styles.historyFormat, f === "PDF" ? styles.fmtPdf : styles.fmtXlsx].join(" ")}>{f === "XLSX" ? "EXCEL" : f}</span>;
    },
    mobile: false,
  },
];

/** v4.2: auditoría de reportes — quién generó cada documento, cuál, con qué filtros y cuándo. */
export const ExportHistory = ({ isAdmin }: { isAdmin: boolean }) => {
  const [page, setPage] = useState(1);
  const query = useExportHistory({ page, limit: 8 });
  return (
    <Card
      className={styles.history}
      title="Historial de reportes generados"
      subtitle={isAdmin ? "Cada PDF o Excel descargado por cualquier persona del equipo, con la hora exacta. También aparece en Auditoría." : "Los reportes que usted ha descargado, con la hora exacta."}
    >
      <QueryState query={query} isEmpty={(p) => p.items.length === 0} empty={<EmptyState art={false} title="Aún no se ha generado ningún reporte" text="Use los botones PDF o Excel de la vista previa." />}>
        {(data) => (
          <>
            <DataTable columns={columns} rows={data.items} rowKey={(r) => r.id} />
            <Pagination page={data} onPage={setPage} />
          </>
        )}
      </QueryState>
    </Card>
  );
};
