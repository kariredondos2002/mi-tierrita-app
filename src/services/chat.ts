import { http } from "@/lib/http";
import type { ChatMessage, Conversation, DirectoryPerson, MessagePage, Person } from "@/types/api";

type HistoryQuery = { before?: string; limit?: number };

/** Historial y respaldo REST del chat. El envío normal va por Socket.io (`@/realtime`). */
export const chatService = {
  general: async (query: HistoryQuery = {}): Promise<MessagePage> => (await http.get<MessagePage>("/chat/general", { params: query })).data,
  private: async (userId: number, query: HistoryQuery = {}): Promise<MessagePage> =>
    (await http.get<MessagePage>(`/chat/private/${userId}`, { params: query })).data,
  sendGeneral: async (content: string): Promise<ChatMessage> => (await http.post<ChatMessage>("/chat/general", { content })).data,
  sendPrivate: async (userId: number, content: string): Promise<ChatMessage> => (await http.post<ChatMessage>(`/chat/private/${userId}`, { content })).data,
  markRead: async (userId: number): Promise<number> => (await http.post<{ updated: number }>(`/chat/private/${userId}/read`)).data.updated,
  conversations: async (): Promise<Conversation[]> => (await http.get<{ conversations: Conversation[] }>("/chat/conversations")).data.conversations,
  people: async (): Promise<DirectoryPerson[]> => (await http.get<{ people: DirectoryPerson[] }>("/chat/people")).data.people,
  online: async (): Promise<Person[]> => (await http.get<{ people: Person[] }>("/chat/online")).data.people,
  unread: async (): Promise<number> => (await http.get<{ unread: number }>("/chat/unread")).data.unread,
};
