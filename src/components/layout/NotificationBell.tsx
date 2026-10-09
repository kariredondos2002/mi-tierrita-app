import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/notifications";
import { relative } from "@/components/chat/chatFormat";
import type { NotificationKind } from "@/types/api";
import styles from "./Topbar.module.css";

const KIND: Record<NotificationKind, { icon: string; tone: string }> = {
  SALE: { icon: "$", tone: styles.kindSale ?? "" },
  SALE_VOIDED: { icon: "↺", tone: styles.kindWarn ?? "" },
  PAYMENT: { icon: "✓", tone: styles.kindGood ?? "" },
  PURCHASE: { icon: "▣", tone: styles.kindGood ?? "" },
  LOW_STOCK: { icon: "!", tone: styles.kindWarn ?? "" },
  SCENARIO: { icon: "↗", tone: styles.kindSale ?? "" },
  CONTACT: { icon: "@", tone: "" },
  MESSAGE: { icon: "✉", tone: "" },
};

/** Campana con las notificaciones del negocio; las nuevas llegan por Socket.io sin recargar. */
export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const list = useNotifications();
  const mark = useMarkNotificationsRead();
  const unread = list.data?.unread ?? 0;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={box}>
      <button type="button" className={styles.bellBtn} aria-label={unread ? `Notificaciones: ${unread} sin leer` : "Notificaciones"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2.5 a4.8 4.8 0 0 1 4.8 4.8 v3.2 l1.4 2.4 h-12.4 l1.4 -2.4 v-3.2 A4.8 4.8 0 0 1 10 2.5 z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8.2 15.6 a1.9 1.9 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {unread > 0 ? <span className={styles.count}>{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Notificaciones">
          <div className={styles.panelHead}>
            <h3>Notificaciones</h3>
            {unread > 0 ? (
              <button type="button" className={styles.linkBtn} onClick={() => mark.mutate(undefined)}>
                Marcar todas como leídas
              </button>
            ) : null}
          </div>
          <div className={styles.items}>
            {(list.data?.notifications.length ?? 0) === 0 ? <div className={styles.empty}>No hay notificaciones por ahora.</div> : null}
            {list.data?.notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={[styles.item, n.read ? "" : styles.unread].join(" ")}
                onClick={() => {
                  if (!n.read) mark.mutate([n.id]);
                  setOpen(false);
                  if (n.link) navigate(n.link);
                }}
              >
                <span className={[styles.kind, KIND[n.kind].tone].join(" ")} aria-hidden="true">
                  {KIND[n.kind].icon}
                </span>
                <span className={styles.itemText}>
                  {n.message}
                  <small>{relative(n.createdAt)}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** Estado de la conexión en tiempo real para la barra superior. */
export { ConnectionStatus } from "./ConnectionStatus";
