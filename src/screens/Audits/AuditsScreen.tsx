import { useEffect, useState } from "react";
import { useAudits } from "@/hooks/audits";
import { useUsers } from "@/hooks/users";
import { dateTime, int } from "@/lib/format";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, Card, DataTable, EmptyState, Field, Input, Pagination, QueryState, Select, type Column } from "@/components/ui";
import type { Audit, AuditQuery } from "@/types/api";
import { AuditMethodBadge } from "./AuditMethodBadge";
import styles from "./AuditsScreen.module.css";

const PAGE_SIZE = 25;

const useDebounced = <T,>(value: T, ms: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
};

/** Mismas columnas que la tarjeta «Registro de actividad» de Usuarios y roles. */
const columns: Column<Audit>[] = [
  { key: "createdAt", header: "Fecha y hora", width: "180px", render: (a) => <span className={styles.date}>{dateTime(a.createdAt)}</span> },
  { key: "username", header: "Usuario", align: "left", width: "160px", render: (a) => <span className={styles.user}>{a.username}</span> },
  {
    key: "resource",
    header: "Recurso y detalle",
    align: "left",
    render: (a) => (
      <span className={styles.resourceCell}>
        <span className={styles.mono}>{a.resource}</span>
        {a.detail ? <small className={styles.detail}>{a.detail}</small> : null}
      </span>
    ),
  },
  { key: "method", header: "Acción", align: "left", width: "110px", render: (a) => <AuditMethodBadge method={a.method} /> },
];

/** Tipos de acción: escrituras (middleware) y, desde la v4.2, reportes generados e inicios de sesión. */
const METHOD_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "POST", label: "Altas (POST)" },
  { value: "PUT", label: "Cambios (PUT)" },
  { value: "DELETE", label: "Borrados (DELETE)" },
  { value: "EXPORT", label: "Reportes generados" },
  { value: "SIGNIN", label: "Inicios de sesión" },
];

/** CU-18 Auditoría: escrituras, reportes generados e inicios de sesión (solo ADMIN). */
export const AuditsScreen = () => {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [method, setMethod] = useState("");
  const [resource, setResource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedResource = useDebounced(resource.trim(), 400);

  const users = useUsers({ limit: 100 });

  const filters: AuditQuery = {
    page,
    limit: PAGE_SIZE,
    ...(userId ? { userId: Number(userId) } : {}),
    ...(method ? { method } : {}),
    ...(debouncedResource ? { resource: debouncedResource } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
  const query = useAudits(filters);
  const hasFilters = Boolean(userId || method || resource || from || to);

  const clear = () => {
    setUserId("");
    setMethod("");
    setResource("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Auditoría" subtitle="Quién hizo qué y cuándo: escrituras, reportes generados (PDF y Excel) e inicios de sesión." />

      <Card title="Filtros" subtitle="Por usuario, tipo de acción, recurso o rango de fechas" className={styles.card}>
        <div className={styles.filters}>
          <Field label="Usuario" htmlFor="audit-user">
            <Select
              id="audit-user"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {(users.data?.items ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} · {u.username}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Acción" htmlFor="audit-method">
            <Select
              id="audit-method"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(1);
              }}
            >
              {METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Recurso" htmlFor="audit-resource" hint="Por ejemplo /sales o /products/12">
            <Input
              id="audit-resource"
              placeholder="Ruta del recurso"
              value={resource}
              onChange={(e) => {
                setResource(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Desde" htmlFor="audit-from">
            <Input
              id="audit-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Hasta" htmlFor="audit-to">
            <Input
              id="audit-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          {hasFilters ? (
            <div className={styles.filterActions}>
              <Button variant="ghost" onClick={clear}>
                Limpiar filtros
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <Card title="Registro de actividad" subtitle={query.data ? `${int(query.data.count)} registros · escrituras, reportes generados e inicios de sesión` : "Se auditan las escrituras, cada reporte descargado y cada inicio de sesión"} className={styles.card}>
        <QueryState
          query={query}
          isEmpty={(data) => data.items.length === 0}
          empty={
            <EmptyState
              title="No hay registros con esos filtros"
              text={hasFilters ? "Pruebe con otro usuario, recurso o rango de fechas." : "Las escrituras aparecerán aquí a medida que el equipo use el sistema."}
              action={
                hasFilters ? (
                  <Button variant="secondary" size="sm" onClick={clear}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(data) => (
            <>
              <DataTable columns={columns} rows={data.items} rowKey={(a) => a.id} />
              <div className={styles.pager}>
                <Pagination page={data} onPage={setPage} />
              </div>
            </>
          )}
        </QueryState>
      </Card>
    </div>
  );
};
