import { Component, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { m } from "motion/react";
import { useImmersive } from "./useImmersive";
import { sendSceneCommand } from "./sceneCommands";
import { StageContext } from "./stageContext";
import styles from "./Stage.module.css";

type Props = {
  /** Antetítulo del enfoque (ERP · BI · DSS). */
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Escena 3D (perezosa). Solo se monta si hay WebGL y la vista 3D está activa. */
  scene: ReactNode;
  /** Alternativa en lista: misma información y mismas acciones, sin 3D. */
  list: ReactNode;
  /** Capas de interfaz sobre la escena: panel de detalle, leyenda, progreso. */
  overlay?: ReactNode;
  /** Ayuda de interacción para mouse, táctil y teclado. */
  hint?: string;
  /** Acciones adicionales en la cabecera. */
  actions?: ReactNode;
  size?: "md" | "lg";
  label: string;
};

/** Si WebGL falla en pleno uso (contexto perdido, driver), la escena cae a la vista en lista sin romper la pantalla. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("Escena 3D desactivada:", error.message, info.componentStack?.slice(0, 120));
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Cargador de la escena: anillos concéntricos y texto (sin movimiento si el usuario lo pidió). */
export const StageLoader = ({ text = "Construyendo la escena…" }: { text?: string }) => (
  <div className={styles.loader} role="status">
    <span className={styles.rings} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
    <span>{text}</span>
  </div>
);

const Cube = () => (
  <svg width="15" height="15" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7 L11 3 L19 7 L11 11 Z" />
    <path d="M3 7 V15 L11 19 V11" />
    <path d="M19 7 V15 L11 19" />
  </svg>
);
const ListIcon = () => (
  <svg width="15" height="15" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <path d="M8 5.5 h11 M8 11 h11 M8 16.5 h11" />
    <circle cx="4" cy="5.5" r="1" fill="currentColor" />
    <circle cx="4" cy="11" r="1" fill="currentColor" />
    <circle cx="4" cy="16.5" r="1" fill="currentColor" />
  </svg>
);

/**
 * Escenario inmersivo: tarjeta oscura con profundidad donde vive una escena 3D interactiva.
 * Siempre ofrece la vista en lista (accesible por teclado y lector de pantalla) y cae a ella sin WebGL.
 */
export const Stage = ({ eyebrow, title, subtitle, scene, list, overlay, hint, actions, size = "lg", label }: Props) => {
  const { show3D, webgl, setMode, mode, reducedMotion } = useImmersive();
  const listView = <div className={styles.list}>{list}</div>;
  const sectionRef = useRef<HTMLElement>(null);
  const portal = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const ctx = useMemo(() => ({ portal, visible }), [visible]);
  return (
    <m.section
      ref={sectionRef}
      className={[styles.stage, size === "md" ? styles.md : ""].join(" ")}
      aria-label={label}
      initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={styles.head}>
        <div className={styles.titles}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        <div className={styles.headActions}>
          {actions}
          <div className={styles.switch} role="radiogroup" aria-label="Tipo de vista">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "3d" && webgl}
              disabled={!webgl}
              title={webgl ? "Vista 3D interactiva" : "Este navegador no puede dibujar 3D"}
              className={mode === "3d" && webgl ? styles.on : ""}
              onClick={() => setMode("3d")}
            >
              <Cube /> 3D
            </button>
            <button type="button" role="radio" aria-checked={!show3D} className={!show3D ? styles.on : ""} onClick={() => setMode("2d")}>
              <ListIcon /> Lista
            </button>
          </div>
        </div>
      </header>
      <StageContext.Provider value={ctx}>
        <div className={styles.viewportWrap}>
        {show3D ? (
          <div className={styles.viewport}>
            <SceneBoundary fallback={listView}>
              <Suspense fallback={<StageLoader />}>{scene}</Suspense>
            </SceneBoundary>
            {overlay}
            <div className={styles.zoom} role="group" aria-label="Cámara">
              <button type="button" onClick={() => sendSceneCommand("zoomIn")} aria-label="Acercar">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2.5 v9 M2.5 7 h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
              <button type="button" onClick={() => sendSceneCommand("zoomOut")} aria-label="Alejar">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7 h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
              <button type="button" onClick={() => sendSceneCommand("reset")} aria-label="Volver a la vista general">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8 a5 5 0 1 0 1.6 -3.7 M3 2.8 V5.2 H5.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            {hint ? (
              <p className={styles.hint} aria-hidden="true">
                {hint}
              </p>
            ) : null}
          </div>
        ) : (
          listView
        )}
          {show3D ? <div ref={portal} className={styles.portal} aria-hidden="true" /> : null}
        </div>
      </StageContext.Provider>
    </m.section>
  );
};
