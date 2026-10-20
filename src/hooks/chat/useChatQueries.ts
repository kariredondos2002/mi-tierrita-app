import { useQuery } from "@tanstack/react-query";
import { keys } from "@/hooks/shared";
import { chatService } from "@/services/chat";

/** Conversaciones privadas con último mensaje y no leídos (se refrescan con chat:privado y chat:leido). */
export const useConversations = () => useQuery({ queryKey: [...keys.chat, "conversations"], queryFn: chatService.conversations, staleTime: 30_000 });

/** Directorio del equipo con estado y última conexión. */
export const usePeople = () => useQuery({ queryKey: [...keys.chat, "people"], queryFn: chatService.people, staleTime: 60_000 });

/** Sin leer: total (insignia del menú y título), canal general, cada privado y menciones. */
export const useUnreadSummary = (enabled = true) =>
  useQuery({ queryKey: [...keys.chat, "unread"], queryFn: chatService.unread, staleTime: 30_000, enabled });

/** Total sin leer, para la insignia del menú. */
export const useUnreadMessages = (enabled = true) => {
  const q = useUnreadSummary(enabled);
  return { ...q, data: q.data?.unread };
};

/** Mensajes fijados de la conversación abierta (se refrescan con chat:fijado). */
export const usePinned = (scope: "general" | number) => useQuery({ queryKey: [...keys.chat, "pinned", scope], queryFn: () => chatService.pinned(scope), staleTime: 30_000 });
