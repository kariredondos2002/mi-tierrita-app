import { useExperienceStore } from "@/stores/experience";
import { useSessionStore } from "@/stores/session";
import { notify } from "@/stores/toasts";

/**
 * Misiones del administrador: cada una lleva a revisar un punto crítico del sistema identificado en el diagnóstico.
 * La gamificación tiene un propósito: que nadie deje de mirar vencimientos, cartera y la decisión antes de pedir el crédito.
 */
export type Mission = { id: string; title: string; why: string; path: string; done: (s: { unlocked: string[]; visited: string[] }) => boolean };

export const MISSIONS: Mission[] = [
  { id: "recorrido-sistema", title: "Recorrer el mapa del sistema", why: "Entender cómo se conectan mercancía, dinero e información.", path: "/", done: (s) => s.unlocked.includes("recorrido-sistema") },
  { id: "lotes", title: "Revisar los lotes por vencer", why: "Riesgo sanitario y pérdidas por vencimiento.", path: "/lotes", done: (s) => s.visited.includes("/lotes") },
  { id: "fefo-simulado", title: "Simular una venta FEFO", why: "Ver qué lote descuenta el sistema primero.", path: "/lotes", done: (s) => s.unlocked.includes("fefo-simulado") },
  { id: "cartera", title: "Revisar la cartera en mora", why: "La mora presiona la caja que pagará la cuota.", path: "/clientes", done: (s) => s.visited.includes("/clientes") },
  { id: "escenarios", title: "Comparar los escenarios de crédito", why: "Elegir la financiación que la ampliación puede pagar.", path: "/finanzas", done: (s) => s.unlocked.includes("escenarios") },
];

/** Desbloquea un logro una sola vez y lo celebra con un aviso breve. */
export const unlockAchievement = (id: string) => {
  const user = useSessionStore.getState().user?.username;
  if (!user) return;
  if (useExperienceStore.getState().unlock(user, id)) {
    const m = MISSIONS.find((x) => x.id === id);
    if (m) notify.success(`Misión cumplida: ${m.title}`);
  }
};
