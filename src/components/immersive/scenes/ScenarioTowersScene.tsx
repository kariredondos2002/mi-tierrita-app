import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Tier } from "../useImmersive";
import { Hoverable, Label, SceneCamera, SelectionDisc, StageCanvas, StageHtml, damp } from "./kit";
import { Pbr } from "./materials";
import { Model, preloadModels } from "./assets";
import styles from "./SceneLabel.module.css";

preloadModels(["potted_plant_02"]);

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

/*
 * Maquetas arquitectónicas sobre la mesa de reuniones: cada escenario es un modelo de cartón blanco de la
 * ampliación. Cada piso equivale a 0,25 × de cobertura de la cuota (cuatro pisos = la ampliación paga su
 * propia cuota); la lámina de acrílico marca ese 1,0 ×. El banderín de la cubierta dice si el escenario crea
 * valor (VPN > 0, verde) o no (rojo), y la placa del frente resume las cifras.
 */
const UNIT = 2.4; // 1,0 × = 2,4 unidades
const FLOOR = UNIT / 4;
const GAP = 3.4;

const TONE: Record<Tower["tone"], string> = { good: "#2f7d52", warn: "#c98a1d", bad: "#b3392b" };

/** Fachada de maqueta: ventanas recortadas en el cartón (líneas grises) para leer los pisos y la escala. */
const facadeTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#f4f2ec";
    x.fillRect(0, 0, 256, 128);
    x.fillStyle = "#c9c6bd";
    for (let i = 0; i < 6; i++) x.fillRect(14 + i * 41, 34, 26, 58);
    x.fillStyle = "#dedbd3";
    for (let i = 0; i < 6; i++) x.fillRect(14 + i * 41, 34, 26, 6);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
})();

/** Placa impresa del escenario, apoyada en la mesa frente a la maqueta. */
const usePlaque = (t: Tower) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 192;
    const x = c.getContext("2d")!;
    x.fillStyle = "#faf8f2";
    x.fillRect(0, 0, 512, 192);
    x.fillStyle = TONE[t.tone];
    x.fillRect(0, 0, 14, 192);
    x.fillStyle = "#1b1f1c";
    x.font = "700 64px Fraunces, Georgia, serif";
    x.fillText(t.letter, 36, 82);
    x.font = "700 44px 'Plus Jakarta Sans Variable', system-ui, sans-serif";
    x.fillText(t.coverageText, 120, 76);
    x.fillStyle = "#47534c";
    x.font = "600 26px 'Plus Jakarta Sans Variable', system-ui, sans-serif";
    let name = t.name;
    while (x.measureText(name).width > 440 && name.length > 4) name = name.slice(0, -2);
    x.fillText(name === t.name ? name : `${name}…`, 36, 128);
    x.fillText(`VPN ${t.npvText}`, 36, 168);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [t]);

const Massing = ({ coverage, width, depth, dimmed }: { coverage: number; width: number; depth: number; dimmed: boolean }) => {
  const full = Math.floor(coverage * 4);
  const part = coverage * 4 - full;
  const floors = [...Array.from({ length: full }, () => 1), ...(part > 0.05 ? [part] : [])];
  if (floors.length === 0) floors.push(0.15);
  const fac = useMemo(() => {
    const t = facadeTex().clone();
    t.repeat.set(Math.max(1, Math.round(width / 0.9)), 1);
    t.needsUpdate = true;
    return t;
  }, [width]);
  let y = 0;
  return (
    <group>
      {floors.map((f, i) => {
        const h = FLOOR * f;
        const at = y;
        y += h;
        return (
          <group key={i} position-y={at}>
            <mesh position-y={h / 2} castShadow receiveShadow>
              <boxGeometry args={[width, h - 0.03, depth]} />
              <meshStandardMaterial map={fac} roughness={0.92} transparent={dimmed} opacity={dimmed ? 0.55 : 1} />
            </mesh>
            {/* placa de entrepiso (canto de cartón más oscuro) */}
            <mesh position-y={h - 0.015} castShadow receiveShadow>
              <boxGeometry args={[width + 0.06, 0.03, depth + 0.06]} />
              <meshStandardMaterial color="#e2ded3" roughness={0.85} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const Pennant = ({ good, at, reducedMotion }: { good: boolean; at: number; reducedMotion: boolean }) => {
  const cloth = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (reducedMotion || !cloth.current) return;
    cloth.current.rotation.y = Math.sin(state.clock.elapsedTime * 2.2) * 0.18;
  });
  return (
    <group position-y={at}>
      <mesh position-y={0.35} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.7, 8]} />
        <meshStandardMaterial color="#c8c9c6" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh ref={cloth} position={[0.17, 0.58, 0]} castShadow>
        <planeGeometry args={[0.34, 0.2]} />
        <meshStandardMaterial color={good ? "#2f8a57" : "#c0392b"} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const TowerModel = ({ t, x, selected, dimmed, onSelect, reducedMotion, maxCredit }: { t: Tower; x: number; selected: boolean; dimmed: boolean; onSelect: () => void; reducedMotion: boolean; maxCredit: number }) => {
  const h = Math.max(0.15, t.coverage) * UNIT;
  const width = 1.25 + (maxCredit > 0 ? t.credit / maxCredit : 0.5) * 0.9;
  const depth = 1.5;
  const plaque = usePlaque(t);
  const body = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    // la maqueta «se arma» piso a piso al cambiar de escenario (transición de estado)
    if (body.current) body.current.scale.y = reducedMotion ? 1 : damp(body.current.scale.y, 1, 3, dt);
  });
  return (
    <Hoverable position={[x, 0, 0]} selected={selected} dimmed={dimmed} reducedMotion={reducedMotion} onSelect={onSelect}>
      {({ hovered }) => (
        <>
          <SelectionDisc radius={width * 0.75} active={selected || hovered} color={TONE[t.tone]} />
          {/* base de cartón gris, como en las maquetas reales */}
          <mesh position-y={0.02} receiveShadow castShadow>
            <boxGeometry args={[width + 0.5, 0.04, depth + 0.5]} />
            <meshStandardMaterial color="#8d8a83" roughness={0.95} />
          </mesh>
          <group ref={body} position-y={0.04} scale-y={reducedMotion ? 1 : 0.001}>
            <Massing coverage={Math.max(0.0375, t.coverage)} width={width} depth={depth} dimmed={dimmed} />
          </group>
          <Pennant good={t.npv > 0} at={h + 0.04} reducedMotion={reducedMotion} />
          {/* placa del escenario apoyada en la mesa */}
          <group position={[0, 0.16, depth / 2 + 0.75]} rotation-x={-0.95}>
            <mesh castShadow>
              <boxGeometry args={[1.5, 0.56, 0.03]} />
              <meshStandardMaterial color="#e9e6de" roughness={0.6} />
            </mesh>
            <mesh position-z={0.016}>
              <planeGeometry args={[1.48, 0.555]} />
              <meshStandardMaterial map={plaque} roughness={0.5} />
            </mesh>
          </group>
          <Label position={[0, h + 1.15, 0]} title={`${t.letter} · ${t.coverageText}`} value={`VPN ${t.npvText}`} hot={selected || hovered} dim={false} tone={t.tone} />
        </>
      )}
    </Hoverable>
  );
};

/** Lámina de acrílico a 1,0 ×: por encima, la ampliación paga su propia cuota. */
const CoverageSheet = ({ width, tier }: { width: number; tier: Tier }) => (
  <group position-y={UNIT + 0.04}>
    <mesh rotation-x={-Math.PI / 2} renderOrder={3}>
      <boxGeometry args={[width, 4.4, 0.03]} />
      {tier === "high" ? (
        <meshPhysicalMaterial color="#dcebf3" transmission={0.92} thickness={0.04} roughness={0.08} ior={1.49} transparent opacity={0.6} depthWrite={false} />
      ) : (
        <meshStandardMaterial color="#cfe3ef" transparent opacity={0.22} roughness={0.1} depthWrite={false} />
      )}
    </mesh>
    {/* soportes metálicos en las esquinas */}
    {[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[(sx * width) / 2 - sx * 0.12, -UNIT / 2 - 0.02, sz * 2.05]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, UNIT, 10]} />
          <meshStandardMaterial color="#b9bcbd" metalness={0.9} roughness={0.25} />
        </mesh>
      )),
    )}
    <StageHtml position={[-width / 2 + 1.6, 0.05, 2.35]}>
      <div className={styles.tip}>1,0 × · la ampliación paga su cuota</div>
    </StageHtml>
  </group>
);

const Content = ({ towers, selected, onSelect, tier, reducedMotion, narrow }: ScenarioTowersSceneProps) => {
  const width = Math.max(1, towers.length) * GAP;
  const maxCredit = Math.max(1, ...towers.map((t) => t.credit));
  const xs = useMemo(() => towers.map((_, i) => (i - (towers.length - 1) / 2) * GAP), [towers]);
  const home = useMemo(
    () => ({ pos: [narrow ? 1.5 : 2.5, narrow ? 7 : 5.2, narrow ? 19 : 14.5] as [number, number, number], target: [0, 1.9, 0.4] as [number, number, number] }),
    [narrow],
  );
  const i = towers.findIndex((t) => t.id === selected);
  // la cámara se inclina levemente hacia el escenario elegido sin perder la comparación
  const view = i >= 0 ? { pos: [xs[i]! * 0.55 + (narrow ? 0 : 1.5), home.pos[1], home.pos[2] - 1.2] as [number, number, number], target: [xs[i]! * 0.55, 1.9, 0.4] as [number, number, number] } : home;
  const tableW = width + 6;
  return (
    <>
      <SceneCamera view={view} home={home} reducedMotion={reducedMotion} narrow={narrow} minDistance={5} maxDistance={24} />
      {/* mesa de reuniones de madera */}
      <mesh position={[0, -0.12, 0.6]} receiveShadow>
        <boxGeometry args={[tableW, 0.24, 9]} />
        <Pbr name="table" repeat={[tableW / 3, 3]} roughness={0.85} />
      </mesh>
      {/* una matera sobre la mesa de reuniones */}
      <Model name="potted_plant_02" at={[-width / 2 - 1.8, 0, -1.4]} scale={2.6} />
      <CoverageSheet width={width + 1} tier={tier} />
      {towers.map((t, k) => (
        <TowerModel key={t.id} t={t} x={xs[k]!} selected={selected === t.id} dimmed={selected !== null && selected !== t.id} onSelect={() => onSelect(t.id)} reducedMotion={reducedMotion} maxCredit={maxCredit} />
      ))}
    </>
  );
};

/** Escenarios como maquetas: altura = cuántas veces la ampliación paga su cuota; banderín = si crea valor. */
const ScenarioTowersScene = (props: ScenarioTowersSceneProps) => (
  <StageCanvas
    tier={props.tier}
    reducedMotion={props.reducedMotion}
    camera={{ position: [3, 5.6, 13.5], fov: 40 }}
    env="studio"
    envIntensity={1}
    backgroundBlur={0.7}
    sun={[-6, 11, 7]}
    sunColor="#fff3e0"
    sunIntensity={2.2}
    shadowBox={12}
    label="Maquetas 3D que comparan cuántas veces cada escenario paga la cuota del crédito"
  >
    <Content {...props} />
  </StageCanvas>
);

export default ScenarioTowersScene;
