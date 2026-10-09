import { useQuery } from "@tanstack/react-query";
import { keys } from "@/hooks/shared";
import { chatService } from "@/services/chat";

/** Conversaciones privadas con último mensaje y no leídos (se refrescan con chat:privado y chat:leido). */
export const useConversations = () => useQuery({ queryKey: [...keys.chat, "conversations"], queryFn: chatService.conversations, staleTime: 30_000 });

/** Directorio del equipo con estado y última conexión. */
export const usePeople = () => useQuery({ queryKey: [...keys.chat, "people"], queryFn: chatService.people, staleTime: 60_000 });

/** Total de privados sin leer, para la insignia del menú y el título de la pestaña. */
export const useUnreadMessages = (enabled = true) =>
  useQuery({ queryKey: [...keys.chat, "unread"], queryFn: chatService.unread, staleTime: 30_000, enabled });
