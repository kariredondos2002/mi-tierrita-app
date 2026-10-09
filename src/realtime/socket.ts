import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import type { Person } from "@/types/api";

/**
 * Conexión Socket.io única por pestaña (patrón de SoftUnity). La abre `RealtimeBridge`
 * cuando hay sesión y la cierra al salir. El servidor es la misma API: el origen se
 * deduce de VITE_API_URL.
 *
 * status: connecting → online; si se cae, reconnecting (Socket.io reintenta solo)
 * y vuelve a online; offline solo al cerrar sesión.
 */
export type ConnectionStatus = "connecting" | "online" | "reconnecting" | "offline";

type RealtimeState = {
  socket: Socket | null;
  status: ConnectionStatus;
  online: Person[];
  setSocket: (socket: Socket | null) => void;
  setStatus: (status: ConnectionStatus) => void;
  setOnline: (people: Person[]) => void;
  addOnline: (person: Person) => void;
  removeOnline: (id: number) => void;
};

export const useRealtimeStore = create<RealtimeState>()((set) => ({
  socket: null,
  status: "offline",
  online: [],
  setSocket: (socket) => set({ socket }),
  setStatus: (status) => set({ status }),
  setOnline: (online) => set({ online }),
  addOnline: (person) => set((s) => ({ online: s.online.some((p) => p.id === person.id) ? s.online : [...s.online, person] })),
  removeOnline: (id) => set((s) => ({ online: s.online.filter((p) => p.id !== id) })),
}));

/** Origen del servidor de sockets: el de la API (o el mismo sitio si la API es relativa). */
export const socketOrigin = (apiUrl: string | undefined = import.meta.env.VITE_API_URL): string | undefined => {
  if (!apiUrl || apiUrl.startsWith("/")) return undefined;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return undefined;
  }
};

export const createSocket = (token: string): Socket =>
  io(socketOrigin(), { auth: { token }, transports: ["websocket", "polling"], reconnectionDelayMax: 8000 });

/** Escucha uno o varios eventos mientras el componente está montado; el manejador puede cambiar sin re-suscribir. */
export const useSocketEvent = <T,>(events: string | string[], handler: (payload: T) => void): void => {
  const socket = useRealtimeStore((s) => s.socket);
  const ref = useRef(handler);
  ref.current = handler;
  const key = Array.isArray(events) ? events.join("|") : events;
  useEffect(() => {
    if (!socket) return undefined;
    const names = key.split("|");
    const listener = (payload: T) => ref.current(payload);
    for (const n of names) socket.on(n, listener);
    return () => {
      for (const n of names) socket.off(n, listener);
    };
  }, [socket, key]);
};

export const useIsOnline = (userId: number | undefined): boolean => useRealtimeStore((s) => userId !== undefined && s.online.some((p) => p.id === userId));
