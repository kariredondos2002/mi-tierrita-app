import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { NodeKey, SystemFlow, SystemNode } from "../systemTypes";
import type { Tier } from "../useImmersive";
import { Flow, Ground, Hoverable, Label, SceneCamera, SelectionDisc, StageCanvas } from "./kit";
import { Pbr } from "./materials";
import { box } from "./geometry";
import { Model, ModelInstances, preloadModels } from "./assets";
import { CashDeskModel, ConstructionModel, FarmHouse, OfficeModel, StorefrontModel, Tree, TruckModel, WarehouseModel, WarningSign } from "./models";

preloadModels(["sack_bovino","sack_sal","sack_urea","cement_bag","island_tree_02_trunk","hand_truck","plastic_crate_01","metal_jerrycan","propane_tank","grass_medium_01","grass_medium_02","rock_moss_set_01","street_lamp_01","utility_box_01","plastic_bottle_gallon","bleach_bottle","multi_cleaner_bottle","wooden_display_shelves_01","potted_plant_02","planter_box_01","watering_can_metal_01","metal_office_desk","desk_lamp_arm_01","wooden_ladder","wooden_crate_02"]);

export type SystemMapSceneProps = {
  nodes: SystemNode[];
  flows: SystemFlow[];
  selected: NodeKey | null;
  onSelect: (key: NodeKey | null) => void;
  onOpen: (key: NodeKey) => void;
  tier: Tier;
  reducedMotion: boolean;
  narrow: boolean;
};

/**
 * Maqueta del negocio: la bodega y el local al fondo, el camión del proveedor por la vía, las fincas de los
 * clientes a la derecha, la caja y la obra de la ampliación al frente y la oficina del SIG en el centro.
 */
export const NODE_POS: Record<NodeKey, [number, number, number]> = {
  proveedores: [-12.4, 0, 0.8],
  bodega: [-6.6, 0, -6.2],
  mostrador: [4.8, 0, -6.4],
  clientes: [11.2, 0, 0.6],
  caja: [5.4, 0, 6.6],
  ampliacion: [-5.8, 0, 6.8],
  sig: [0, 0, 0],
};

/** Por dónde entra y sale cada flujo (el patio o la puerta de cada punto, no el centro del techo). */
const ANCHOR: Record<NodeKey, [number, number, number]> = {
  proveedores: [-11.6, 0, 0.6],
  bodega: [-6.4, 0, -2.6],
  mostrador: [4.8, 0, -3.6],
  clientes: [9.4, 0, 0.6],
  caja: [5.2, 0, 5.3],
  ampliacion: [-5.6, 0, 5.0],
  sig: [0, 0, 0],
};

const HOME_VIEW = { pos: [2.5, 10.5, 24] as [number, number, number], target: [0, 0.5, -1.2] as [number, number, number] };
const HOME_NARROW = { pos: [27, 31, 3] as [number, number, number], target: [1.6, 0, 0.2] as [number, number, number] };

/** La cámara mira desde el frente y deja el objeto a la izquierda: el panel de detalle ocupa la derecha. */
const viewFor = (selected: NodeKey | null, narrow: boolean) => {
  if (!selected) return narrow ? HOME_NARROW : HOME_VIEW;
  const [x, , z] = NODE_POS[selected];
  const shift = narrow ? 0 : 3.2;
  const near = selected === "clientes" || selected === "caja" || selected === "sig" ? 0.82 : 1;
  return {
    pos: [x + shift, (narrow ? 10 : 7.4) * near, z + (narrow ? 14 : 11.5) * near] as [number, number, number],
    target: [x + shift, narrow ? 0.6 : 1.1, z] as [number, number, number],
  };
};

const LABEL_Y: Record<NodeKey, number> = { proveedores: 2.5, bodega: 3.9, mostrador: 3.6, clientes: 2.0, caja: 2.0, ampliacion: 3.8, sig: 2.7 };
const DISC_R: Record<NodeKey, number> = { proveedores: 2.3, bodega: 3.6, mostrador: 3.2, clientes: 3.0, caja: 1.9, ampliacion: 2.8, sig: 2.0 };

const verdictText = (tone: SystemNode["tone"]) => (tone === "good" ? "VIABLE" : tone === "warn" ? "EN REVISIÓN" : tone === "bad" ? "NO VIABLE" : "EN ESTUDIO");

/** Cada punto del sistema con su modelo; los datos de la API gobiernan cantidades, alturas y señales. */
const NodeObject = ({ node, glow, reducedMotion }: { node: SystemNode; glow: number; reducedMotion: boolean }): ReactNode => {
  switch (node.key) {
    case "proveedores":
      return (
        <group>
          <group rotation-y={Math.PI} position-z={0.2}>
            <TruckModel load={node.level} />
          </group>
          {/* descargue: carretilla, canastas, cilindros y canecas junto al camión */}
          <Model name="hand_truck" at={[1.25, 0, -1.4]} rot={-0.5} scale={1.6} />
          <ModelInstances name="plastic_crate_01" items={[{ p: [1.3, 0, 0.2], r: 0.1, s: 1.6 }, { p: [1.32, 0.26, 0.22], r: -0.05, s: 1.6 }, { p: [1.75, 0, 0.3], r: 0.3, s: 1.6 }]} />
          <ModelInstances name="metal_jerrycan" items={[{ p: [1.0, 0, 1.25], r: 0.4, s: 1.6 }, { p: [1.3, 0, 1.35], r: 0.1, s: 1.6 }]} />
          <Model name="propane_tank" at={[1.8, 0, 1.1]} scale={1.6} />
        </group>
      );
    case "bodega":
      return (
        <group position-z={-1.6}>
          <WarehouseModel stacks={Math.max(3, Math.min(9, node.count ?? 6))} height={node.level} critical={node.critical ?? 0} />
        </group>
      );
    case "mostrador":
      return (
        <group position-z={-0.9}>
          <StorefrontModel activity={node.level} />
        </group>
      );
    case "clientes": {
      const n = Math.max(3, Math.min(7, node.count ?? 5));
      const spots: [number, number, number, number][] = [
        [-0.9, 0, -2.4, 0.3],
        [1.6, 0, -1.6, -0.2],
        [-1.3, 0, 0.2, 0.5],
        [1.3, 0, 0.9, -0.35],
        [-0.4, 0, 2.6, 0.15],
        [2.2, 0, 3.0, -0.5],
        [-2.4, 0, 2.4, 0.7],
      ];
      return (
        <group>
          {spots.slice(0, n).map(([x, y, z, r], i) => (
            <FarmHouse key={i} at={[x, y, z]} rot={r} overdue={i < (node.critical ?? 0)} reducedMotion={reducedMotion} />
          ))}
        </group>
      );
    }
    case "caja":
      return <CashDeskModel level={node.level} />;
    case "ampliacion":
      return <ConstructionModel floors={Math.max(1, Math.min(3, Math.round(1 + node.level * 2)))} verdict={verdictText(node.tone)} tone={node.tone} />;
    default:
      return <OfficeModel glow={glow} />;
  }
};

/** Vía pavimentada por donde llegan los proveedores, con línea central y bermas de tierra. */
const Road = () => {
  const strip = useMemo(() => box(2.6, 0.04, 34, [0, 0.02, 0], 3), []);
  const shoulder = useMemo(() => box(3.6, 0.02, 34, [0, 0.008, 0], 3), []);
  return (
    <group position={[-12.4, 0, 0]}>
      <mesh geometry={shoulder} receiveShadow>
        <Pbr name="dirt" />
      </mesh>
      <mesh geometry={strip} receiveShadow>
        <Pbr name="asphalt" roughness={1} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[0, 0.042, -16 + i * 2.4]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.08, 1.2]} />
          <meshStandardMaterial color="#e9c64a" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};

const TREES: { at: [number, number, number]; s: number }[] = [
  { at: [-15.5, 0, -9], s: 1.5 },
  { at: [-10.8, 0, -11], s: 1.25 },
  { at: [-1.2, 0, -10.6], s: 1.4 },
  { at: [10.4, 0, -10.4], s: 1.3 },
  { at: [15.6, 0, -5.2], s: 1.55 },
  { at: [16.2, 0, 6.4], s: 1.35 },
  { at: [-15.8, 0, 9.6], s: 1.4 },
  { at: [-9.6, 0, 12.4], s: 1.2 },
  { at: [11.6, 0, 10.6], s: 1.45 },
  { at: [-1.6, 0, -6.0], s: 0.95 },
];

/** Matas de pasto, piedras con musgo, postes de luz y el contador de energía (escaneos reales). */
const GRASS = Array.from({ length: 70 }, (_, i) => {
  const a = i * 2.39996;
  const r = 9 + ((i * 37) % 100) / 100 * 15;
  return { p: [Math.cos(a) * r, 0, Math.sin(a) * r * 0.8] as [number, number, number], r: a * 3, s: 1.2 + ((i * 13) % 7) / 10 };
}).filter((g) => Math.hypot(g.p[0] + 12.4, 0) > 2.4);

const Surroundings = ({ tier }: { tier: Tier }) => (
  <>
    <ModelInstances name="grass_medium_02" items={tier === "high" ? GRASS : GRASS.slice(0, 30)} castShadow={false} />
    {tier === "high" ? <ModelInstances name="grass_medium_01" items={GRASS.filter((_, i) => i % 3 === 0).map((g) => ({ ...g, r: g.r + 1 }))} castShadow={false} /> : null}
    <Model name="rock_moss_set_01" at={[14.5, 0, -8]} rot={0.4} scale={0.35} />
    <Model name="rock_moss_set_01" at={[-15, 0, 12]} rot={2.1} scale={0.3} />
    <ModelInstances name="street_lamp_01" items={[{ p: [-10.6, 0, -6], r: -Math.PI / 2, s: 1.4 }, { p: [-10.6, 0, 6.5], r: -Math.PI / 2, s: 1.4 }]} />
    <Model name="utility_box_01" at={[-10.7, 0, -1.6]} rot={-Math.PI / 2} scale={1.4} />
  </>
);

const SceneContent = ({ nodes, flows, selected, onSelect, onOpen, tier, reducedMotion, narrow }: SystemMapSceneProps) => {
  const vec = useMemo(() => Object.fromEntries(Object.entries(ANCHOR).map(([k, p]) => [k, new THREE.Vector3(...p)])) as Record<NodeKey, THREE.Vector3>, []);
  const trees = tier === "high" ? TREES : TREES.slice(0, 6);
  return (
    <>
      <SceneCamera view={viewFor(selected, narrow)} home={narrow ? HOME_NARROW : HOME_VIEW} reducedMotion={reducedMotion} narrow={narrow} minDistance={7} maxDistance={narrow ? 56 : 40} />
      <Ground radius={26} material="grass" texSize={4} color="#b4cf95" onMiss={() => onSelect(null)} />
      <Road />
      <Surroundings tier={tier} />
      {trees.map((t, i) => (
        <Tree key={i} at={t.at} scale={t.s} seed={i + 3} />
      ))}
      {flows.map((f, i) => {
        const related = selected === null ? null : f.from === selected || f.to === selected;
        return (
          <Flow
            key={i}
            from={vec[f.from]}
            to={vec[f.to]}
            kind={f.kind}
            intensity={f.intensity}
            bend={f.kind === "informacion" ? -0.08 : 0.12}
            tier={tier}
            reducedMotion={reducedMotion}
            highlighted={related}
          />
        );
      })}
      {nodes.map((n) => {
        const isSel = selected === n.key;
        const dim = selected !== null && !isSel;
        return (
          <Hoverable
            key={n.key}
            position={NODE_POS[n.key]}
            selected={isSel}
            dimmed={dim}
            reducedMotion={reducedMotion}
            onSelect={() => onSelect(isSel ? null : n.key)}
            onOpen={() => onOpen(n.key)}
          >
            {({ hovered }) => (
              <>
                <SelectionDisc radius={DISC_R[n.key]} active={isSel || hovered} color={n.alert ? "#ffd38a" : "#ffffff"} />
                <NodeObject node={n} glow={isSel ? 1 : hovered ? 0.6 : 0} reducedMotion={reducedMotion} />
                {n.alert ? <WarningSign bad={n.tone === "bad"} at={[DISC_R[n.key] * 0.78, 0, DISC_R[n.key] * 0.55]} /> : null}
                <Label position={[0, LABEL_Y[n.key], 0]} title={n.title} value={n.metrics[0]?.value} hot={isSel || hovered} dim={dim} tone={n.tone} />
              </>
            )}
          </Hoverable>
        );
      })}
    </>
  );
};

/** Mapa vivo del negocio: proveedores → bodega → mostrador → clientes → caja → decisión, con el SIG en el centro. */
const SystemMapScene = (props: SystemMapSceneProps) => (
  <StageCanvas
    tier={props.tier}
    reducedMotion={props.reducedMotion}
    camera={{ position: [...HOME_VIEW.pos], fov: 36 }}
    env="morning"
    envIntensity={0.75}
    backgroundBlur={0.04}
    sun={[-16, 18, 11]}
    sunColor="#ffe9c8"
    sunIntensity={3.4}
    exposure={1.2}
    shadowBox={22}
    label="Maqueta 3D del negocio con sus flujos de mercancía, dinero e información"
  >
    <SceneContent {...props} />
  </StageCanvas>
);

export default SystemMapScene;
