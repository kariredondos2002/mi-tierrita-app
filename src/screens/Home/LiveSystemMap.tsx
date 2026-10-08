import { lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { m } from "motion/react";
import { Stage } from "@/components/immersive/Stage";
import { Dock, InfoPanel, Legend, LiveRegion, MetricList, ProgressRing, Reward } from "@/components/immersive/Overlay";
import { useImmersive } from "@/components/immersive/useImmersive";
import { FLOW_LABEL, type NodeKey, type SystemFlow, type SystemNode } from "@/components/immersive/systemTypes";
import { STAGE } from "@/components/immersive/palette";
import { useExperienceStore } from "@/stores/experience";
import { TOUR } from "./systemModel";
import styles from "./LiveSystemMap.module.css";

const SystemMapScene = lazy(() => import("@/components/immersive/scenes/SystemMapScene"));

const LEGEND = [
  { color: STAGE.sprout, label: "Mercancía" },
  { color: STAGE.harvest, label: "Dinero" },
  { color: STAGE.sky, label: "Información" },
];

const SHORT: Record<NodeKey, string> = {
  sig: "SIG",
  proveedores: "Proveedores",
  bodega: "Bodega",
  mostrador: "Mostrador",
  clientes: "Clientes",
  caja: "Caja",
  ampliacion: "Ampliación",
};

const ACHIEVEMENT = "recorrido-sistema";

/**
 * «Mapa vivo del negocio»: el sistema de Mi Tierrita como un territorio 3D. Cada objeto es un proceso con sus
 * cifras reales; las partículas son los flujos de mercancía, dinero e información; las balizas, los puntos críticos.
 * Seleccionar → el objeto se ilumina, la cámara vuela, aparece el detalle → se puede abrir el módulo.
 */
export const LiveSystemMap = ({ nodes, flows, username }: { nodes: SystemNode[]; flows: SystemFlow[]; username: string }) => {
  const navigate = useNavigate();
  const { tier, reducedMotion, narrow } = useImmersive();
  const [selected, setSelected] = useState<NodeKey | null>(null);
  const [reward, setReward] = useState(false);
  const explored = useExperienceStore((s) => s.explored[username]) ?? [];
  const markExplored = useExperienceStore((s) => s.markExplored);
  const unlock = useExperienceStore((s) => s.unlock);
  const byKey = useMemo(() => Object.fromEntries(nodes.map((n) => [n.key, n])) as Record<NodeKey, SystemNode>, [nodes]);
  const critical = nodes.filter((n) => n.alert);

  const select = useCallback(
    (key: NodeKey | null) => {
      setSelected(key);
      if (!key) return;
      markExplored(username, key);
      const all = TOUR.every((k) => k === key || useExperienceStore.getState().explored[username]?.includes(k));
      if (all && unlock(username, ACHIEVEMENT)) setReward(true);
    },
    [markExplored, unlock, username],
  );

  useEffect(() => {
    if (!reward) return;
    const t = window.setTimeout(() => setReward(false), 6000);
    return () => window.clearTimeout(t);
  }, [reward]);

  const next = () => {
    const i = selected ? TOUR.indexOf(selected) : -1;
    select(TOUR[(i + 1) % TOUR.length]!);
  };
  const startTour = () => select(TOUR.find((k) => !explored.includes(k)) ?? TOUR[0]!);
  const open = (key: NodeKey) => navigate(byKey[key].path);

  const node = selected ? byKey[selected] : null;
  const related = node ? flows.filter((f) => f.from === node.key || f.to === node.key) : [];
  const doneCount = TOUR.filter((k) => explored.includes(k)).length;

  const tourButton = (
    <button type="button" className={styles.tourBtn} onClick={startTour}>
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M12.8 7.2 L11.2 11.2 L7.2 12.8 L8.8 8.8 Z" />
      </svg>
      {doneCount === TOUR.length ? "Repetir recorrido" : doneCount > 0 ? "Continuar recorrido" : "Recorrido guiado"}
    </button>
  );

  return (
    <Stage
      label="Mapa vivo del negocio"
      eyebrow="SIG · Pensamiento sistémico"
      title="Mapa vivo del negocio"
      subtitle="Cada objeto es un proceso con sus cifras de hoy. Siga la mercancía, el dinero y la información hasta la decisión de ampliar."
      actions={tourButton}
      hint="Arrastre para girar · Ctrl + rueda o pellizco para acercar · clic para explorar · doble clic abre el módulo · Esc vuelve"
      scene={<SystemMapScene nodes={nodes} flows={flows} selected={selected} onSelect={select} onOpen={open} tier={tier} reducedMotion={reducedMotion} narrow={narrow} />}
      overlay={
        <>
          <div className={styles.topLeft}>
            <ProgressRing done={doneCount} total={TOUR.length} label="puntos explorados" />
            <Legend items={LEGEND} />
          </div>
          <div className={styles.dock}>
            <Dock
              label="Puntos del sistema"
              items={TOUR.map((k) => ({ key: k, label: SHORT[k], done: explored.includes(k), alert: Boolean(byKey[k]?.alert) }))}
              selected={selected}
              onSelect={select}
            />
          </div>
          <InfoPanel
            open={node !== null}
            panelKey={node?.key ?? "none"}
            eyebrow={node ? `${node.layer} · ${TOUR.indexOf(node.key) + 1} de ${TOUR.length}` : undefined}
            title={node?.title ?? ""}
            tone={node?.tone ?? "neutral"}
            reducedMotion={reducedMotion}
            onClose={() => setSelected(null)}
            actions={
              node ? (
                <>
                  <button type="button" className={styles.primary} onClick={() => open(node.key)}>
                    {node.cta}
                  </button>
                  <button type="button" className={styles.ghost} onClick={next}>
                    Siguiente punto →
                  </button>
                </>
              ) : null
            }
          >
            {node ? (
              <>
                <p>{node.role}</p>
                {node.alert ? (
                  <m.p className={styles.alert} initial={reducedMotion ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                    <span aria-hidden="true">●</span> Punto crítico: {node.alert}
                  </m.p>
                ) : null}
                <MetricList items={node.metrics} reducedMotion={reducedMotion} />
                {related.length > 0 ? (
                  <div>
                    <div className={styles.flowsTitle}>Flujos conectados</div>
                    <ul className={styles.flows}>
                      {related.map((f, i) => (
                        <li key={i}>
                          <span className={styles[`k_${f.kind}`]}>{FLOW_LABEL[f.kind]}</span>
                          {SHORT[f.from]} → {SHORT[f.to]} · {f.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
          </InfoPanel>
          <Reward
            show={reward}
            reducedMotion={reducedMotion}
            title="Recorrido completo: ya conoce su sistema"
            text={critical.length > 0 ? `Quedan ${critical.length} puntos críticos por atender.` : "Ningún punto crítico abierto hoy."}
            onClose={() => setReward(false)}
          />
          <LiveRegion text={node ? `${node.title}. ${node.alert ? `Punto crítico: ${node.alert}. ` : ""}${node.metrics.map((m) => `${m.label}: ${m.value}`).join(". ")}` : ""} />
        </>
      }
      list={
        <div className={styles.listWrap}>
          <div className={styles.listHead}>
            <ProgressRing done={doneCount} total={TOUR.length} label="puntos explorados" />
            {critical.length > 0 ? (
              <span className={styles.critCount}>
                {critical.length} {critical.length === 1 ? "punto crítico" : "puntos críticos"}
              </span>
            ) : null}
          </div>
          <ol className={styles.list}>
            {TOUR.map((k, i) => {
              const n = byKey[k];
              if (!n) return null;
              return (
                <li key={k} className={[styles.item, styles[`t_${n.tone}`]].join(" ")}>
                  <button type="button" className={styles.itemBtn} onClick={() => select(k)} aria-expanded={selected === k}>
                    <span className={styles.step}>{i + 1}</span>
                    <span className={styles.itemTitle}>
                      {n.title}
                      <small>{n.layer}</small>
                    </span>
                    <span className={styles.itemValue}>{n.metrics[0]?.value}</span>
                  </button>
                  {selected === k ? (
                    <div className={styles.itemBody}>
                      <p>{n.role}</p>
                      {n.alert ? <p className={styles.alert}>Punto crítico: {n.alert}</p> : null}
                      <MetricList items={n.metrics} reducedMotion={reducedMotion} />
                      <button type="button" className={styles.primary} onClick={() => open(k)}>
                        {n.cta}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      }
    />
  );
};
