import { http } from "@/lib/http";
import type { ContactInput, ContactMessage } from "@/types/api";

export const contactService = {
  /** Pública: formulario de la página de inicio. */
  send: async (input: ContactInput): Promise<void> => {
    await http.post("/contact", input);
  },
  list: async (): Promise<ContactMessage[]> => (await http.get<{ items: ContactMessage[] }>("/contact")).data.items,
  markHandled: async (id: number): Promise<void> => {
    await http.post(`/contact/${id}/handled`);
  },
};
