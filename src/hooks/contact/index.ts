import { useQuery } from "@tanstack/react-query";
import { keys, useApiMutation } from "@/hooks/shared";
import { contactService } from "@/services/contact";
import type { ContactInput } from "@/types/api";

/** Formulario público de contacto (página de inicio). */
export const useSendContact = () => useApiMutation((input: ContactInput) => contactService.send(input), { notifyError: false });

export const useContactMessages = (enabled = true) => useQuery({ queryKey: keys.contact, queryFn: contactService.list, enabled, staleTime: 60_000 });

export const useMarkContactHandled = () =>
  useApiMutation((id: number) => contactService.markHandled(id), { invalidate: [keys.contact], success: "Marcado como atendido." });
