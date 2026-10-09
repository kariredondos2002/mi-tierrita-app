import type { ReactNode } from "react";
import type { ApiError } from "@/lib/errors";
import { toApiError } from "@/lib/errors";
import { Button } from "./Button";
import gardening from "@/assets/ill/gardening_jck1.svg";
import styles from "./States.module.css";

/** Los tres estados de toda pantalla (documento 02, sección 5): cargando, vacío y con datos. */
export const Loading = ({ text = "Cargando…", inline = false }: { text?: string; inline?: boolean }) => (
  <div className={[styles.box, inline ? styles.inline : ""].join(" ")} role="status">
    <div className={styles.spinner} />
    <span>{text}</span>
  </div>
);

/** Estado vacío con ilustración plana (unDraw, licencia libre); `art={false}` la oculta en tarjetas pequeñas. */
export const EmptyState = ({ title, text, action, art = true }: { title: string; text?: string; action?: ReactNode; art?: boolean | string }) => (
  <div className={styles.box}>
    {art ? <img className={styles.art} src={typeof art === "string" ? art : gardening} alt="" aria-hidden="true" loading="lazy" /> : null}
    <span className={styles.title}>{title}</span>
    {text ? <span>{text}</span> : null}
    {action}
  </div>
);

export const ErrorState = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => {
  const e: ApiError = toApiError(error);
  return (
    <div className={styles.box}>
      <span className={styles.title}>No se pudo cargar</span>
      <span>{e.message}</span>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
};

type QueryLike<T> = { data: T | undefined; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };

/** Envuelve una consulta y renderiza cargando / error / vacío / con datos en el orden correcto. */
export const QueryState = <T,>({ query, isEmpty, empty, children }: { query: QueryLike<T>; isEmpty?: (data: T) => boolean; empty: ReactNode; children: (data: T) => ReactNode }) => {
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data === undefined) return <Loading />;
  if (isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
};
