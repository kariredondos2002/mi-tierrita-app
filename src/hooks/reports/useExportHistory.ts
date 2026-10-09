import { useQuery } from "@tanstack/react-query";
import { keys } from "@/hooks/shared";
import { reportsService } from "@/services/reports";
import type { PageQuery } from "@/types/api";

/** v4.2: quién generó qué reporte y cuándo. */
export const useExportHistory = (query: PageQuery) =>
  useQuery({ queryKey: [...keys.reports, "exports", query], queryFn: () => reportsService.exportsHistory(query), placeholderData: (prev) => prev });
