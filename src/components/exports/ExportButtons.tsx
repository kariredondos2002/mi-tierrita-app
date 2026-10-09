import { useState } from "react";
import { Button } from "@/components/ui";
import type { ExportFormat } from "@/types/api";
import styles from "./ExportButtons.module.css";

const PdfIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 1.5h5.5L13 5v9.5H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M6 9.5h5M6 12h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const SheetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2 6.5h12M6.5 6.5v7" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

type Props = { onExport: (format: ExportFormat) => Promise<unknown>; disabled?: boolean };

/**
 * v4.2: descarga el reporte generado por la API — PDF con gráficos o Excel con hojas formateadas.
 * Cada descarga queda en la auditoría con usuario, hora y filtros.
 */
export const ExportButtons = ({ onExport, disabled }: Props) => {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const run = (format: ExportFormat) => {
    setBusy(format);
    onExport(format)
      .catch(() => undefined)
      .finally(() => setBusy(null));
  };
  return (
    <div className={styles.exportButtons}>
      <Button size="sm" onClick={() => run("pdf")} loading={busy === "pdf"} disabled={disabled || busy !== null} title="PDF con indicadores, gráficos y detalle">
        <PdfIcon /> PDF
      </Button>
      <Button variant="secondary" size="sm" onClick={() => run("xlsx")} loading={busy === "xlsx"} disabled={disabled || busy !== null} title="Libro de Excel con hojas formateadas">
        <SheetIcon /> Excel
      </Button>
    </div>
  );
};
