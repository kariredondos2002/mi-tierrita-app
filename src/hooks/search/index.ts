import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { searchService } from "@/services/search";

/** Búsqueda global (Ctrl + K): solo consulta con 2 caracteres o más. */
export const useGlobalSearch = (q: string) =>
  useQuery({
    queryKey: ["search", q],
    queryFn: ({ signal }) => searchService.search(q, signal),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
