import { http } from "@/lib/http";
import type { NotificationList } from "@/types/api";

export const notificationsService = {
  list: async (): Promise<NotificationList> => (await http.get<NotificationList>("/notifications")).data,
  markRead: async (ids?: number[]): Promise<number> => (await http.post<{ updated: number }>("/notifications/read", ids ? { ids } : {})).data.updated,
};
