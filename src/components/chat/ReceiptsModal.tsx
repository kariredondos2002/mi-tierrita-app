import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui";
import { chatService } from "@/services/chat";
import { keys } from "@/hooks/shared";
import { ROLE_LABELS } from "@/stores/session";
import { PersonAvatar } from "./PersonAvatar";
import { dayLabel, timeOf } from "./chatFormat";
import styles from "./ChatPlus.module.css";

const GROUPS = [
  { status: "READ", title: "Visto por", tone: styles.toneRead },
  { status: "DELIVERED", title: "Entregado a", tone: styles.toneDelivered },
  { status: "PENDING", title: "Pendiente de recibir", tone: styles.tonePending },
] as const;

/** Detalle de un mensaje propio: quién lo vio, a quién se entregó y quién sigue pendiente, con la hora. */
export const ReceiptsModal = ({ messageId, onClose }: { messageId: number | null; onClose: () => void }) => {
  const q = useQuery({ queryKey: [...keys.chat, "receipts", messageId], queryFn: () => chatService.receipts(messageId as number), enabled: messageId !== null, refetchInterval: 8000 });
  return (
    <Modal open={messageId !== null} title="Información del mensaje" description="Solo usted, como autor, ve este detalle." onClose={onClose}>
      {q.isLoading ? <p className={styles.muted}>Cargando…</p> : null}
      {q.isError ? <p role="alert">No se pudo cargar el detalle.</p> : null}
      {q.data
        ? GROUPS.map((g) => {
            const rows = q.data.people.filter((p) => p.status === g.status);
            if (rows.length === 0) return null;
            return (
              <section key={g.status} className={styles.receiptGroup}>
                <h4 className={g.tone}>
                  {g.title} · {rows.length}
                </h4>
                {rows.map((r) => {
                  const at = r.readAt ?? r.deliveredAt;
                  return (
                    <div key={r.person.id} className={styles.receiptRow}>
                      <PersonAvatar name={r.person.name} role={r.person.role} size={30} />
                      <span className={styles.receiptName}>
                        {r.person.name}
                        <small>{ROLE_LABELS[r.person.role]}</small>
                      </span>
                      {at ? (
                        <time dateTime={at}>
                          {dayLabel(at)} {timeOf(at)}
                        </time>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })
        : null}
    </Modal>
  );
};
