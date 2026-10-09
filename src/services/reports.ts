import { http } from "@/lib/http";
import { downloadFile } from "@/lib/download";
import type { Audit, ExportFormat, InventoryReport, Page, PageQuery, ReceivablesReport, SalesGroupBy, SalesReport } from "@/types/api";

export const reportsService = {
  sales: async (query: { from?: string; to?: string; groupBy?: SalesGroupBy }): Promise<SalesReport> => (await http.get<SalesReport>("/reports/sales", { params: query })).data,
  inventory: async (days?: number): Promise<InventoryReport> => (await http.get<InventoryReport>("/reports/inventory", { params: { days } })).data,
  receivables: async (overdueDays?: number): Promise<ReceivablesReport> => (await http.get<ReceivablesReport>("/reports/receivables", { params: { overdueDays } })).data,
  /** v4.2: PDF con gráficos o Excel; la API registra quién lo generó y cuándo. Devuelve el nombre del archivo. */
  exportSales: (format: ExportFormat, query: { from?: string; to?: string; groupBy?: SalesGroupBy }): Promise<string> =>
    downloadFile("/reports/sales/export", { format, ...query }, `ventas.${format}`),
  exportInventory: (format: ExportFormat, days?: number): Promise<string> => downloadFile("/reports/inventory/export", { format, days }, `inventario.${format}`),
  exportReceivables: (format: ExportFormat, overdueDays?: number): Promise<string> =>
    downloadFile("/reports/receivables/export", { format, overdueDays }, `cartera.${format}`),
  /** Historial de reportes generados: el administrador ve todos; la secretaria, los suyos. */
  exportsHistory: async (query: PageQuery): Promise<Page<Audit>> => (await http.get<Page<Audit>>("/reports/exports", { params: query })).data,
};
