import { Component, type ErrorInfo, type ReactNode } from "react";
import alertArt from "@/assets/ill/alert_w756.svg";
import styles from "./ErrorBoundary.module.css";

type Props = { children: ReactNode; resetKey?: string };
type State = { error: Error | null };

/**
 * Red de seguridad de la interfaz (como en SoftUnity): si una pantalla falla al dibujarse,
 * se muestra un aviso con opción de reintentar en lugar de dejar la página en blanco.
 * Cambiar de ruta (resetKey) limpia el error.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de interfaz:", error, info.componentStack);
  }

  override componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={styles.box} role="alert">
        <img src={alertArt} alt="" width={160} />
        <h2>Algo salió mal en esta pantalla</h2>
        <p>Sus datos están a salvo en el servidor. Puede reintentar o volver al inicio.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => this.setState({ error: null })}>
            Reintentar
          </button>
          <a href="/" className={styles.secondary}>
            Ir al inicio
          </a>
        </div>
      </div>
    );
  }
}
