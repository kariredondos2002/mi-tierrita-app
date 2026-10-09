import { useIsFetching } from "@tanstack/react-query";
import { useRealtimeStore } from "@/realtime/socket";
import styles from "./Topbar.module.css";

/** «En vivo» con Socket.io conectado; «Reconectando…» si se cayó; «Sincronizando…» mientras llegan datos. */
export const ConnectionStatus = () => {
  const status = useRealtimeStore((s) => s.status);
  const fetching = useIsFetching();
  const label =
    status === "reconnecting" ? "Reconectando…" : status === "connecting" ? "Conectando…" : status === "offline" ? "Sin tiempo real" : fetching > 0 ? "Sincronizando…" : "En vivo";
  const tone = status === "reconnecting" || status === "connecting" || fetching > 0 ? styles.statusWarn : status === "offline" ? styles.statusOff : "";
  return (
    <span className={[styles.status, tone].join(" ")} role="status" title="Estado de la conexión en tiempo real">
      <span className={styles.statusDot} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
