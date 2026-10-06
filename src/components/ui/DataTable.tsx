import type { ReactNode } from "react";
import styles from "./DataTable.module.css";

export type Column<T> = { key: string; header: ReactNode; align?: "left" | "right" | "center"; render: (row: T) => ReactNode; width?: string; /** false: se oculta en pantallas de celular. */ mobile?: boolean };

type Props<T> = { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string | number; onRowClick?: (row: T) => void; footer?: ReactNode };

/** Texto a la izquierda por defecto; números a la derecha (align: "right"); columna de acciones (sin encabezado) a la derecha. */
const cls = <T,>(c: Column<T>) => {
  const align = c.align ?? (c.header === "" ? "right" : "left");
  const base = align === "right" ? styles.right : align === "center" ? styles.center : styles.left;
  return c.mobile === false ? `${base} ${styles.hideSm}` : base;
};

/** Tabla «Tierra viva»: cabecera en versalitas sobre fondo suave, filas de 44px, hover verde claro. */
export const DataTable = <T,>({ columns, rows, rowKey, onRowClick, footer }: Props<T>) => (
  <div className={styles.wrap}>
    <table className={[styles.table, onRowClick ? styles.clickable : ""].join(" ")}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={cls(c)} style={c.width ? { width: c.width } : undefined}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns.map((c) => (
              <td key={c.key} className={cls(c)}>
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer !== undefined ? <tfoot>{footer}</tfoot> : null}
    </table>
  </div>
);
