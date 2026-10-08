import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { STAGE, toneColor } from "../palette";
import type { Tier } from "../useImmersive";
import { Hoverable, Label, Platform, SceneCamera, SelectionDisc, StageCanvas, StageHtml, damp } from "./kit";
import styles from "./SceneLabel.module.css";

export type Tower = {
  id: number;
  letter: string;
  name: string;
  /** Cobertura incremental de la cuota (veces). Gobierna la altura. */
  coverage: number;
  npv: number;
  credit: number;
  tone: "good" | "warn" | "bad";
  coverageText: string;
  npvText: string;
};

export type ScenarioTowersSceneProps = {
  towers: Tower[];
  selected: number | null;
  onSelect: (id: number) => void;
  tier: Tier;
  reducedMotion: boolean;
  narrow: boolean;
};

/** Escala vertical: 1,0 × de cobertura = 2,4 unidades. */
const UNIT = 2.4;
const GAP = 3.4;

const TowerMesh = ({ t, x, selected, dimmed, onSelect, reducedMotion, maxCredit }: { t: Tower; x: number; selected: boolean; dimmed: boolean; onSelect: () => void; reducedMotion: boolean; maxCredit: number }) => {
  const h = Math.max(0.15, t.coverage * UNIT);
  const color = toneColor(t.tone);
  const body = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Mesh>(null);
  const radius = 0.55 + (maxCredit > 0 ? t.credit / maxCredit : 0.5) * 0.45;
  useFrame((state, dt) => {
    // la torre crece desde el suelo hasta su cobertura (transición de estado al cambiar de escenario)
    if (body.current) body.current.scale.y = reducedMotion ? 1 : damp(body.current.scale.y, 1, 2.6, dt);
    if (crystal.current && !reducedMotion) {
      crystal.current.rotation.y += dt * 0.9;
      crystal.current.position.y = h + 0.75 + Math.sin(state.clock.elapsedTime * 1.6 + x) * 0.1;
    }
  });
  return (
    <Hoverable position={[x, 0, 0]} selected={selected} dimmed={dimmed} reducedMotion={reducedMotion} onSelect={onSelect}>
      {({ hovered }) => (
        <>
          <SelectionDisc radius={radius + 0.55} active={selected || hovered} color={color} />
          <group ref={body} scale-y={reducedMotion ? 1 : 0.001}>
            <mesh position-y={h / 2} castShadow>
              <cylinderGeometry args={[radius, radius * 1.08, h, 6]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={selected ? 0.6 : hovered ? 0.4 : 0.18}
                roughness={0.25}
                metalness={0.35}
                transparent
                opacity={dimmed ? 0.45 : 0.92}
              />
              <Edges color="#f4faf6" threshold={20} />
            </mesh>
          </group>
          {/* cristal superior: verde si el proyecto crea valor (VPN > 0), rojo si no */}
          <mesh ref={crystal} position-y={h + 0.75} castShadow>
            <octahedronGeometry args={[0.32, 0]} />
            <meshStandardMaterial color={t.npv > 0 ? STAGE.sprout : STAGE.badSolid} emissive={t.npv > 0 ? STAGE.sprout : STAGE.badSolid} emissiveIntensity={0.6} flatShading />
          </mesh>
          <Label position={[0, h + 1.75, 0]} title={`${t.letter} · ${t.coverageText}`} value={`VPN ${t.npvText}`} hot={selected || hovered} dim={false} tone={t.tone} />
        </>
      )}
    </Hoverable>
  );
};

/** Plano de vidrio a 1,0 ×: por encima, la ampliación paga su propia cuota; por debajo, el negocio pone la diferencia. */
const CoveragePlane = ({ width, reducedMotion }: { width: number; reducedMotion: boolean }) => {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (reducedMotion || !mat.current) return;
    mat.current.opacity = 0.16 + Math.sin(state.clock.elapsedTime * 1.4) * 0.04;
  });
  return (
    <group position-y={UNIT}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width, 4.2]} />
        <meshStandardMaterial ref={mat} color={STAGE.sky} emissive={STAGE.sky} emissiveIntensity={0.4} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, 4.2).rotateX(-Math.PI / 2)]} />
        <lineBasicMaterial color={STAGE.sky} />
      </lineSegments>
      <StageHtml position={[-width / 2 + 1.6, 0.05, 2.3]}>
        <div className={styles.tip}>1,0 × · la ampliación paga su cuota</div>
      </StageHtml>
    </group>
  );
};

const Content = ({ towers, selected, onSelect, tier, reducedMotion, narrow }: ScenarioTowersSceneProps) => {
  const width = Math.max(1, towers.length) * GAP;
  const maxCredit = Math.max(1, ...towers.map((t) => t.credit));
  const xs = useMemo(() => towers.map((_, i) => (i - (towers.length - 1) / 2) * GAP), [towers]);
  const home = useMemo(
    () => ({ pos: [narrow ? 1.5 : 2.5, narrow ? 7 : 5.6, narrow ? 19 : 15.5] as [number, number, number], target: [0, 2.4, 0] as [number, number, number] }),
    [narrow],
  );
  const i = towers.findIndex((t) => t.id === selected);
  // la cámara se inclina levemente hacia el escenario elegido sin perder la comparación
  const view = i >= 0 ? { pos: [xs[i]! * 0.55 + (narrow ? 0 : 1.5), home.pos[1], home.pos[2] - 1.2] as [number, number, number], target: [xs[i]! * 0.55, 2.4, 0] as [number, number, number] } : home;
  return (
    <>
      <SceneCamera view={view} home={home} reducedMotion={reducedMotion} narrow={narrow} minDistance={6} maxDistance={26} />
      <Platform radius={Math.max(8, width / 2 + 2.5)} tier={tier} />
      <CoveragePlane width={width + 1} reducedMotion={reducedMotion} />
      {towers.map((t, k) => (
        <TowerMesh key={t.id} t={t} x={xs[k]!} selected={selected === t.id} dimmed={selected !== null && selected !== t.id} onSelect={() => onSelect(t.id)} reducedMotion={reducedMotion} maxCredit={maxCredit} />
      ))}
    </>
  );
};

/** Torres de escenarios: altura = cuántas veces la ampliación paga su propia cuota; cristal = si crea valor. */
const ScenarioTowersScene = (props: ScenarioTowersSceneProps) => (
  <StageCanvas tier={props.tier} reducedMotion={props.reducedMotion} camera={{ position: [3, 6.2, 13.5], fov: 40 }} label="Torres 3D que comparan la cobertura de la cuota de cada escenario">
    <Content {...props} />
  </StageCanvas>
);

export default ScenarioTowersScene;
