import { useApiMutation, keys } from "@/hooks/shared";
import { reportsService } from "@/services/reports";
import type { ExportedFile } from "@/lib/download";
import type { ExportFormat, SalesGroupBy } from "@/types/api";

export type ExportRequest =
  | { report: "sales"; format: ExportFormat; from?: string; to?: string; groupBy?: SalesGroupBy }
  | { report: "inventory"; format: ExportFormat; days?: number }
  | { report: "receivables"; format: ExportFormat; overdueDays?: number };

/** v4.2: genera el reporte en PDF o Excel y lo devuelve para la vista previa; al terminar refresca el historial y la auditoría. */
export const useExportReport = () =>
  useApiMutation(
    (req: ExportRequest): Promise<ExportedFile> => {
      if (req.report === "sales") return reportsService.exportSales(req.format, { from: req.from, to: req.to, groupBy: req.groupBy });
      if (req.report === "inventory") return reportsService.exportInventory(req.format, req.days);
      return reportsService.exportReceivables(req.format, req.overdueDays);
    },
    { invalidate: [[...keys.reports, "exports"], keys.audits, [...keys.users, "me", "activity"]], success: (file) => `Reporte generado: ${file.name}. Quedó registrado en la auditoría.` },
  );
