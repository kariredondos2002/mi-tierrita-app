import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, Card, EmptyState, QueryState } from "@/components/ui";
import { useContactMessages, useMarkContactHandled } from "@/hooks/contact";
import { dateTime } from "@/lib/format";
import styles from "./ContactsScreen.module.css";

/** Bandeja de los mensajes que llegan por el formulario de la página pública (solo ADMIN). */
export const ContactsScreen = () => {
  const list = useContactMessages();
  const handle = useMarkContactHandled();
  const pending = list.data?.filter((c) => !c.handled).length ?? 0;
  return (
    <>
      <PageHeader
        eyebrow="Página pública"
        title="Contactos del sitio"
        subtitle={`Mensajes que dejaron clientes y visitantes en el formulario de inicio${pending ? ` · ${pending} por atender` : ""}.`}
      />
      <Card flush>
        <QueryState query={list} isEmpty={(d) => d.length === 0} empty={<EmptyState title="Sin mensajes por ahora" text="Cuando alguien escriba desde la página de inicio, aparecerá aquí y le llegará un aviso a la campana." />}>
          {(items) => (
              <ul className={styles.list}>
                {items.map((c) => (
                  <li key={c.id} className={[styles.item, c.handled ? styles.done : ""].join(" ")}>
                    <div className={styles.head}>
                      <strong>{c.name}</strong>
                      <Badge tone={c.handled ? "neutral" : "warn"}>{c.handled ? "Atendido" : "Por atender"}</Badge>
                      <time>{dateTime(c.createdAt)}</time>
                    </div>
                    <p className={styles.msg}>{c.message}</p>
                    <div className={styles.foot}>
                      <a href={`mailto:${c.email}?subject=${encodeURIComponent("Agropecuaria Mi Tierrita")}`}>{c.email}</a>
                      {c.phone ? <span>{c.phone}</span> : null}
                      {!c.handled ? (
                        <Button size="sm" variant="secondary" loading={handle.isPending && handle.variables === c.id} onClick={() => handle.mutate(c.id)}>
                          Marcar atendido
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
          )}
        </QueryState>
      </Card>
    </>
  );
};
