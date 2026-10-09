import { http } from "@/lib/http";
import type { SearchResults } from "@/types/api";

export const searchService = {
  search: async (q: string, signal?: AbortSignal): Promise<SearchResults> => (await http.get<SearchResults>("/search", { params: { q }, signal })).data,
};
