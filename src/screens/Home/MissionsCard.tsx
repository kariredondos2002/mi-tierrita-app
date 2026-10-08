import { useNavigate } from "react-router-dom";
import { m } from "motion/react";
import { Card } from "@/components/ui";
import { MISSIONS } from "@/components/immersive/missions";
import { useExperienceStore } from "@/stores/experience";
import styles from "./MissionsCard.module.css";

/** Tablero de misiones: progreso del administrador en la revisión de los puntos críticos del sistema. */
export const MissionsCard = ({ username }: { username: string }) => {
  const navigate = useNavigate();
  const unlocked = useExperienceStore((s) => s.unlocked[username]) ?? [];
  const visited = useExperienceStore((s) => s.visited[username]) ?? [];
  const state = { unlocked, visited };
  const done = MISSIONS.filter((m) => m.done(state)).length;
  return (
    <Card title="Misiones de revisión" subtitle="Antes de pedir el crédito, revise cada punto crítico del sistema" actions={<span className={styles.count}>{done} de {MISSIONS.length}</span>}>
      <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={MISSIONS.length} aria-valuenow={done} aria-label="Misiones cumplidas">
        <m.i initial={false} animate={{ width: `${(done / MISSIONS.length) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <ol className={styles.list}>
        {MISSIONS.map((m, i) => {
          const ok = m.done(state);
          return (
            <li key={m.id}>
              <button type="button" className={[styles.item, ok ? styles.ok : ""].join(" ")} onClick={() => navigate(m.path)}>
                <span className={styles.check} aria-hidden="true">
                  {ok ? (
                    <svg width="14" height="14" viewBox="0 0 12 12">
                      <path d="M2.5 6.2 L5 8.6 L9.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={styles.text}>
                  <strong>{m.title}</strong>
                  <small>{m.why}</small>
                </span>
                <span className="sr-only">{ok ? "Cumplida" : "Pendiente"}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </Card>
  );
};
