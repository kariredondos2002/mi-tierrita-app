import { useApiMutation, keys } from "@/hooks/shared";
import { financialService } from "@/services/financial";
import type { ExportFormat } from "@/types/api";

/** v4.2: evaluación del escenario en PDF o Excel, auditada por la API. */
export const useExportScenario = () =>
  useApiMutation(({ id, format }: { id: number; format: ExportFormat }) => financialService.exportScenario(id, format), {
    invalidate: [[...keys.reports, "exports"], keys.audits, [...keys.users, "me", "activity"]],
    success: (name) => `Descargado ${name}. Quedó registrado en la auditoría.`,
  });
