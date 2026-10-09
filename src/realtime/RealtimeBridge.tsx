import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { keys } from "@/hooks/shared";
import { useSessionStore } from "@/stores/session";
import { notify } from "@/stores/toasts";
import type { AppNotification, ChatMessage, NotificationList, Person } from "@/types/api";
import { createSocket, useRealtimeStore } from "./socket";

/** Qué cachés refrescar cuando otro usuario cambia un recurso (evento datos:cambio). */
export const AFFECTED_KEYS: Record<string, readonly QueryKey[]> = {
  products: [keys.products, keys.reports],
  categories: [keys.categories, keys.products],
  batches: [keys.batches, keys.products, keys.reports],
  suppliers: [keys.suppliers, keys.batches, keys.products],
  customers: [keys.customers, keys.reports],
  sales: [keys.sales, keys.products, keys.customers, keys.reports, keys.batches],
  financial: [keys.financial],
  users: [keys.users],
};

const AUTH_ERRORS = new Set(["611", "612"]);

/**
 * Puente entre Socket.io y la aplicación (sin interfaz). Montado una vez dentro del
 * AppShell: abre la conexión con el token, mantiene la presencia, refresca las
 * consultas que otros usuarios cambian y empuja las notificaciones a la campana.
 */
export const RealtimeBridge = () => {
  const token = useSessionStore((s) => s.token);
  const me = useSessionStore((s) => s.user?.id);
  const clearSession = useSessionStore((s) => s.clear);
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const navRef = useRef(navigate);
  navRef.current = navigate;
  const store = useRealtimeStore;

  useEffect(() => {
    if (!token) return undefined;
    const socket = createSocket(token);
    let dropped = false;
    store.getState().setSocket(socket);
    store.getState().setStatus("connecting");

    socket.on("connect", () => {
      store.getState().setStatus("online");
      if (dropped) {
        notify.success("Conexión restablecida.");
        // Al volver, todo lo que pudo cambiar durante la caída se vuelve a pedir.
        void queryClient.invalidateQueries();
      }
      dropped = false;
    });
    socket.on("disconnect", (reason) => {
      if (reason === "io client disconnect") return store.getState().setStatus("offline");
      dropped = true;
      return store.getState().setStatus("reconnecting");
    });
    socket.on("connect_error", (err) => {
      if (AUTH_ERRORS.has(err.message)) {
        socket.close();
        clearSession();
        return;
      }
      dropped = true;
      store.getState().setStatus("reconnecting");
    });

    socket.on("usuarios:conectados", (people: Person[]) => store.getState().setOnline(people));
    socket.on("usuario:conectado", (p: Person) => store.getState().addOnline(p));
    socket.on("usuario:desconectado", ({ id }: { id: number }) => {
      store.getState().removeOnline(id);
      void queryClient.invalidateQueries({ queryKey: [...keys.chat, "people"] });
    });

    socket.on("datos:cambio", ({ resource, actorId }: { resource: string; actorId: number | null }) => {
      if (actorId !== null && actorId === useSessionStore.getState().user?.id) return; // la propia mutación ya invalidó
      for (const key of AFFECTED_KEYS[resource] ?? []) void queryClient.invalidateQueries({ queryKey: key });
    });

    socket.on("notificacion", (n: AppNotification) => {
      queryClient.setQueryData<NotificationList>(keys.notifications, (old) =>
        old ? { unread: old.unread + 1, notifications: [n, ...old.notifications.filter((x) => x.id !== n.id)].slice(0, 30) } : old,
      );
      notify.info(n.message);
    });

    socket.on("chat:privado", (m: ChatMessage) => {
      void queryClient.invalidateQueries({ queryKey: [...keys.chat, "conversations"] });
      void queryClient.invalidateQueries({ queryKey: [...keys.chat, "unread"] });
      const mine = m.sender.id === useSessionStore.getState().user?.id;
      if (!mine && pathRef.current !== `/chat/${m.sender.id}`) notify.info(`${m.sender.name}: ${m.content.slice(0, 80)}`);
    });
    socket.on("chat:leido", () => {
      void queryClient.invalidateQueries({ queryKey: [...keys.chat, "conversations"] });
      void queryClient.invalidateQueries({ queryKey: [...keys.chat, "unread"] });
    });

    return () => {
      socket.removeAllListeners();
      socket.close();
      store.getState().setSocket(null);
      store.getState().setStatus("offline");
      store.getState().setOnline([]);
    };
  }, [token, me, clearSession, queryClient, store]);

  return null;
};
