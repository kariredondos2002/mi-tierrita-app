import { Link } from "react-router-dom";
import { Badge, Card, EmptyState, QueryState } from "@/components/ui";
import { moneyCompact } from "@/lib/format";
import type { ReceivablesReport } from "@/types/api";
import styles from "./HomeScreen.module.css";

type QueryLike = { data: ReceivablesReport | undefined; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };

/** Cartera por cliente: los cinco saldos más altos con su uso del cupo; marca los vencidos. */
export const ReceivablesCard = ({ query }: { query: QueryLike }) => (
  <Card title="Cartera por cliente" subtitle={query.data ? `${moneyCompact(query.data.totalBalance)} por cobrar` : "Saldos a crédito"} actions={<Link className={styles.cardLink} to="/clientes">Ver todos →</Link>}>
    <QueryState query={query} isEmpty={(r) => r.items.length === 0} empty={<EmptyState title="Sin cartera" text="Ningún cliente tiene saldo pendiente." />}>
      {(r) => (
        <ul className={styles.debtors}>
          {[...r.items]
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5)
            .map((c) => {
              const use = c.creditLimit > 0 ? Math.min(c.balance / c.creditLimit, 1) : 1;
              return (
                <li key={c.customerId}>
                  <div className={styles.debtorTop}>
                    <span className={styles.debtorName}>{c.name}</span>
                    <strong>{moneyCompact(c.balance)}</strong>
                  </div>
                  <div className={styles.debtorBar}>
                    <span style={{ width: `${use * 100}%` }} className={c.overdue ? styles.debtorBad : use > 0.8 ? styles.debtorWarn : ""} />
                  </div>
                  <div className={styles.debtorMeta}>
                    <span>{Math.round(use * 100)} % del cupo de {moneyCompact(c.creditLimit)}</span>
                    {c.overdue ? <Badge tone="bad">Vencida</Badge> : null}
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </QueryState>
  </Card>
);
