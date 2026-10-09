import { useQuery } from "@tanstack/react-query";
import { keys, useApiMutation } from "@/hooks/shared";
import { notificationsService } from "@/services/notifications";

/** Campana: últimas notificaciones y contador. Las nuevas llegan por socket (evento notificacion). */
export const useNotifications = () => useQuery({ queryKey: keys.notifications, queryFn: notificationsService.list, staleTime: 60_000 });

export const useMarkNotificationsRead = () =>
  useApiMutation((ids?: number[]) => notificationsService.markRead(ids), { invalidate: [keys.notifications] });
