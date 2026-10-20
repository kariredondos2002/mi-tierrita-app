import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

type Props = { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; xl?: boolean };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo accesible: Escape cierra, el foco entra al abrir, se queda dentro con Tab y vuelve al botón que lo abrió;
 * el fondo no se desplaza mientras está abierto.
 */
export const Modal = ({ open, title, description, onClose, children, footer, wide = false, xl = false }: Props) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={[styles.dialog, wide ? styles.wide : "", xl ? styles.xl : ""].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <div className={styles.head}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? (
              <p className={styles.desc} id={descId}>
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
        {footer !== undefined ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
};
