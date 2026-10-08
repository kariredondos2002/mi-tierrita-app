import { lazy, useMemo } from "react";
import { m } from "motion/react";
import { Stage } from "@/components/immersive/Stage";
import { Legend, LiveRegion } from "@/components/immersive/Overlay";
import { useImmersive } from "@/components/immersive/useImmersive";
import { STAGE } from "@/components/immersive/palette";
import { unlockAchievement } from "@/components/immersive/missions";
import type { Tower } from "@/components/immersive/scenes/ScenarioTowersScene";
import { moneyCompact, times } from "@/lib/format";
import type { ScenarioSummary } from "@/types/api";
import styles from "./ScenarioTowers.module.css";

const ScenarioTowersScene = lazy(() => import("@/components/immersive/scenes/ScenarioTowersScene"));

/** Lectura de cada escenario a partir de los indicadores de la API: tono por VPN y cobertura de la cuota. */
export const toTowers = (items: ScenarioSummary[]): Tower[] =>
  [...items]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((s, i) => {
      const cov = s.indicators.coverageIncremental ?? 0;
      const letter = /^[A-Z]\./.test(s.name) ? s.name[0]! : String.fromCharCode(65 + i);
      return {
        id: s.id,
        letter,
        name: s.name.replace(/^[A-Z]\.\s*/, ""),
        coverage: cov,
        npv: s.indicators.npv,
        credit: s.indicators.credit,
        tone: s.indicators.npv <= 0 ? "bad" : cov >= 1.2 ? "good" : "warn",
        coverageText: times(s.indicators.coverageIncremental),
        npvText: moneyCompact(s.indicators.npv),
      };
    });

/**
 * Comparación espacial de escenarios: la altura de cada torre es cuántas veces la ampliación paga su propia cuota,
 * el plano de vidrio marca 1,0 ×, el cristal dice si crea valor. Clic en una torre = elegir ese escenario.
 */
export const ScenarioTowers = ({ items, selectedId, onSelect }: { items: ScenarioSummary[]; selectedId: number | null; onSelect: (id: number) => void }) => {
  const { tier, reducedMotion, narrow } = useImmersive();
  const towers = useMemo(() => toTowers(items), [items]);
  const current = towers.find((t) => t.id === selectedId);
  const choose = (id: number) => {
    onSelect(id);
    if (id !== selectedId) unlockAchievement("escenarios");
  };
  const max = Math.max(1.5, ...towers.map((t) => t.coverage));
  return (
    <Stage
      size="md"
      label="Comparación 3D de escenarios"
      eyebrow="DSS · Comparar alternativas"
      title="¿Qué alternativa paga su propia cuota?"
      subtitle="Cada torre es un escenario. Su altura es la cobertura de la cuota; si pasa el plano de vidrio, la ampliación se paga sola. El cristal verde indica que crea valor."
      hint="Clic en una torre para elegir el escenario · arrastre para girar · Ctrl + rueda para acercar"
      scene={<ScenarioTowersScene towers={towers} selected={selectedId} onSelect={choose} tier={tier} reducedMotion={reducedMotion} narrow={narrow} />}
      overlay={
        <>
          <div className={styles.legend}>
            <Legend
              items={[
                { color: STAGE.sprout, label: "Cubre con holgura (≥ 1,2 ×)" },
                { color: STAGE.harvest, label: "Crea valor, cobertura justa" },
                { color: STAGE.badSolid, label: "No crea valor" },
              ]}
            />
          </div>
          {current ? (
            <m.div key={current.id} className={styles.current} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <span className={styles.letter}>{current.letter}</span>
              <div>
                <strong>{current.name}</strong>
                <span>
                  Cobertura {current.coverageText} · VPN {current.npvText}
                </span>
              </div>
            </m.div>
          ) : null}
          <LiveRegion text={current ? `Escenario ${current.letter}: ${current.name}. Cobertura ${current.coverageText}. VPN ${current.npvText}.` : ""} />
        </>
      }
      list={
        <ul className={styles.list} aria-label="Escenarios">
          {towers.map((t) => (
            <li key={t.id}>
              <button type="button" className={[styles.row, t.id === selectedId ? styles.rowOn : ""].join(" ")} onClick={() => choose(t.id)} aria-pressed={t.id === selectedId}>
                <span className={styles.letter}>{t.letter}</span>
                <span className={styles.rowName}>{t.name}</span>
                <span className={styles.bar} aria-hidden="true">
                  <i style={{ width: `${Math.min(100, (t.coverage / max) * 100)}%`, background: t.tone === "good" ? STAGE.sprout : t.tone === "warn" ? STAGE.harvest : STAGE.badSolid }} />
                  <b style={{ left: `${(1 / max) * 100}%` }} />
                </span>
                <span className={styles.rowVal}>{t.coverageText}</span>
                <span className={styles.rowVal}>{t.npvText}</span>
              </button>
            </li>
          ))}
        </ul>
      }
    />
  );
};
