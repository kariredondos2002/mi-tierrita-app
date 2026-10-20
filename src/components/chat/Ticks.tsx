import type { ReceiptSummary } from "@/types/api";
import styles from "./ChatPlus.module.css";

type Props = { receipts: ReceiptSummary | null; readAt: string | null; pending?: "sending" | "failed" | undefined; onOpen?: () => void };

/** Estado de un mensaje propio: reloj, ✓ enviado, ✓✓ entregado, ✓✓ azul visto (en grupo, azul cuando todos lo vieron). */
export const messageState = ({ receipts, readAt, pending }: Props): { level: "sending" | "failed" | "sent" | "delivered" | "read"; label: string; counts: string | null } => {
  if (pending === "failed") return { level: "failed", label: "No se envió", counts: null };
  if (pending === "sending") return { level: "sending", label: "Enviando…", counts: null };
  if (receipts === null || receipts.total === 0) return readAt ? { level: "read", label: "Visto", counts: null } : { level: "sent", label: "Enviado", counts: null };
  const counts = receipts.total > 1 ? `${receipts.read}/${receipts.total}` : null;
  if (receipts.read >= receipts.total) return { level: "read", label: "Visto por todos", counts };
  if (receipts.delivered >= receipts.total) return { level: "delivered", label: receipts.read > 0 ? `Visto por ${receipts.read} de ${receipts.total}` : "Entregado", counts: receipts.read > 0 ? counts : null };
  return { level: "sent", label: receipts.delivered > 0 ? `Entregado a ${receipts.delivered} de ${receipts.total}` : "Enviado", counts: receipts.delivered > 0 ? `${receipts.delivered}/${receipts.total}` : null };
};

const Check = ({ double }: { double: boolean }) => (
  <svg width={double ? 18 : 14} height="12" viewBox={double ? "0 0 18 12" : "0 0 14 12"} fill="none" aria-hidden="true">
    <path d="M1.5 6.5 4.8 9.8 11.5 2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    {double ? <path d="M7 9.2 7.6 9.8 14.3 2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /> : null}
  </svg>
);

/** Chulitos de un mensaje propio. Al pulsarlos se abre el detalle por persona (solo el autor lo ve). */
export const Ticks = (props: Props) => {
  const s = messageState(props);
  const icon =
    s.level === "sending" ? (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 3.4V6l1.8 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ) : s.level === "failed" ? (
      <span aria-hidden="true">!</span>
    ) : (
      <Check double={s.level !== "sent"} />
    );
  const body = (
    <>
      <span className={[styles.tick, styles[`tick_${s.level}`]].join(" ")}>{icon}</span>
      {s.counts ? <span className={styles.tickCount}>{s.counts}</span> : null}
      <span className="sr-only">{s.label}</span>
    </>
  );
  return props.onOpen && s.level !== "sending" && s.level !== "failed" ? (
    <button type="button" className={styles.tickBtn} onClick={props.onOpen} title={`${s.label} · ver detalle`}>
      {body}
    </button>
  ) : (
    <span className={styles.tickBtn} title={s.label}>
      {body}
    </span>
  );
};
