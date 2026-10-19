import { http } from "@/lib/http";
import type { ChatAttachment, ChatMessage, ChatThread, Conversation, DirectoryPerson, MessagePage, Person, ReceiptDetail, SendChatInput, UnreadSummary } from "@/types/api";

type HistoryQuery = { before?: string; limit?: number };

/** Historial y respaldo REST del chat. El envío normal va por Socket.io (`@/realtime`). */
export const chatService = {
  general: async (query: HistoryQuery = {}): Promise<MessagePage> => (await http.get<MessagePage>("/chat/general", { params: query })).data,
  private: async (userId: number, query: HistoryQuery = {}): Promise<MessagePage> =>
    (await http.get<MessagePage>(`/chat/private/${userId}`, { params: query })).data,
  /** Envío completo (cita, hilo, adjunto, clientId) — general si recipientId es null. */
  send: async (input: SendChatInput): Promise<ChatMessage> => (await http.post<ChatMessage>("/chat/messages", input)).data,
  markRead: async (userId: number): Promise<number> => (await http.post<{ updated: number }>(`/chat/private/${userId}/read`)).data.updated,
  markGeneralRead: async (): Promise<number> => (await http.post<{ updated: number }>("/chat/general/read")).data.updated,
  conversations: async (): Promise<Conversation[]> => (await http.get<{ conversations: Conversation[] }>("/chat/conversations")).data.conversations,
  people: async (): Promise<DirectoryPerson[]> => (await http.get<{ people: DirectoryPerson[] }>("/chat/people")).data.people,
  online: async (): Promise<Person[]> => (await http.get<{ people: Person[] }>("/chat/online")).data.people,
  unread: async (): Promise<UnreadSummary> => (await http.get<UnreadSummary>("/chat/unread")).data,
  receipts: async (messageId: number): Promise<ReceiptDetail> => (await http.get<ReceiptDetail>(`/chat/messages/${messageId}/receipts`)).data,
  thread: async (messageId: number): Promise<ChatThread> => (await http.get<ChatThread>(`/chat/messages/${messageId}/thread`)).data,
  pin: async (messageId: number, pinned: boolean): Promise<ChatMessage> => (await http.put<ChatMessage>(`/chat/messages/${messageId}/pin`, { pinned })).data,
  pinned: async (scope: "general" | number): Promise<ChatMessage[]> => (await http.get<{ messages: ChatMessage[] }>("/chat/pinned", { params: { scope } })).data.messages,
  search: async (q: string, scope?: "general" | number): Promise<ChatMessage[]> =>
    (await http.get<{ messages: ChatMessage[] }>("/chat/search", { params: { q, scope } })).data.messages,
  upload: async (file: Blob, fileName: string, durationMs?: number): Promise<ChatAttachment> =>
    (
      await http.post<ChatAttachment>("/chat/attachments", file, {
        headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(fileName), ...(durationMs ? { "X-Duration-Ms": String(Math.round(durationMs)) } : {}) },
        timeout: 60_000,
      })
    ).data,
  /** Descarga con el token de sesión y devuelve un blob (las etiquetas <audio>/<img> no pueden enviar cabeceras). */
  download: async (id: number): Promise<Blob> => (await http.get<Blob>(`/chat/attachments/${id}`, { responseType: "blob", timeout: 60_000 })).data,
};
