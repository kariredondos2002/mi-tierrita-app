import { useToastStore } from "@/stores/toasts";
import styles from "./Toasts.module.css";

/** Avisos breves: los errores se anuncian de inmediato (role="alert") y todos se pueden cerrar con teclado. */
export const Toasts = () => {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className={styles.stack} aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} type="button" className={[styles.toast, styles[t.kind]].join(" ")} role={t.kind === "error" ? "alert" : "status"} onClick={() => dismiss(t.id)} title="Cerrar aviso">
          {t.text}
        </button>
      ))}
    </div>
  );
};
