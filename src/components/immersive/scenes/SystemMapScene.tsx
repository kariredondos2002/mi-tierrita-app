import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { STAGE, toneColor } from "../palette";
import type { NodeKey, SystemFlow, SystemNode } from "../systemTypes";
import type { Tier } from "../useImmersive";
import { Beacon, Flow, Hoverable, Label, Platform, SceneCamera, SelectionDisc, StageCanvas } from "./kit";

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

/** Dónde vive cada punto del sistema sobre la plataforma (recorrido de la mercancía en el sentido del reloj). */
export const NODE_POS: Record<NodeKey, [number, number, number]> = {
  proveedores: [-7.2, 0, -1.6],
  bodega: [-3.4, 0, -5.4],
  mostrador: [2.8, 0, -4.8],
  clientes: [7, 0, 0.4],
  caja: [3.4, 0, 4.9],
  ampliacion: [-4.2, 0, 4.6],
  sig: [0, 0, 0],
};

const FLOW_COLOR = { mercancia: STAGE.sprout, dinero: STAGE.harvest, informacion: STAGE.sky } as const;

const HOME = { pos: [0, 16.5, 17.5] as const, target: [0, 0, 0.6] as const };
const HOME_VIEW = { pos: [...HOME.pos] as [number, number, number], target: [...HOME.target] as [number, number, number] };

/** La cámara mira desde el frente y deja el objeto a la izquierda: el panel de detalle ocupa la derecha. */
const HOME_NARROW = { pos: [0, 26, 22] as [number, number, number], target: [0, 0, 1] as [number, number, number] };
const viewFor = (selected: NodeKey | null, narrow: boolean) => {
  if (!selected) return narrow ? HOME_NARROW : HOME_VIEW;
  const [x, , z] = NODE_POS[selected];
  const shift = narrow ? 0 : 2.4;
  return { pos: [x + shift, narrow ? 8 : 6.4, z + (narrow ? 11 : 9)] as [number, number, number], target: [x + shift, narrow ? 0.4 : 0.9, z] as [number, number, number] };
};

const mat = (color: string, emissive = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => (
  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.55} metalness={0.15} {...extra} />
);

/* ---------- objetos de cada nodo ---------- */

const Truck = ({ glow }: { glow: number }) => (
  <group rotation-y={0.5}>
    <RoundedBox args={[2.2, 1.2, 1.15]} radius={0.12} position={[-0.3, 0.85, 0]} castShadow>
      {mat("#dfe9e3", glow * 0.15)}
    </RoundedBox>
    <RoundedBox args={[0.9, 0.95, 1.1]} radius={0.12} position={[1.25, 0.72, 0]} castShadow>
      {mat(STAGE.sky, 0.15 + glow * 0.4)}
    </RoundedBox>
    <mesh position={[1.62, 0.92, 0]}>
      <boxGeometry args={[0.04, 0.4, 0.9]} />
      <meshStandardMaterial color="#0d261c" metalness={0.8} roughness={0.15} />
    </mesh>
    {[-1, 0.2, 1.3].map((x) =>
      [-0.6, 0.6].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.26, z]} rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.18, 18]} />
          <meshStandardMaterial color="#14211b" roughness={0.8} />
        </mesh>
      )),
    )}
  </group>
);

const Warehouse = ({ node, glow }: { node: SystemNode; glow: number }) => {
  const stacks = Math.max(3, Math.min(9, node.count ?? 6));
  const height = 0.4 + node.level * 1.6;
  return (
    <group>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.12, 2.6]} />
        {mat("#284a3b")}
      </mesh>
      {/* estructura del galpón con aristas luminosas */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3.2, 2.8, 2.4]} />
        <meshStandardMaterial color={STAGE.leaf} transparent opacity={0.16} roughness={0.2} metalness={0.3} depthWrite={false} />
        <Edges color={STAGE.sprout} threshold={15} />
      </mesh>
      <mesh position={[0, 3.15, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[2.35, 0.75, 4]} />
        {mat(STAGE.forest, 0.1 + glow * 0.3)}
      </mesh>
      {/* pilas de cajas: la altura sigue el capital en bodega; las críticas en arcilla */}
      {Array.from({ length: stacks }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const crit = i < (node.critical ?? 0);
        const h = height * (0.7 + ((i * 37) % 10) / 30);
        return (
          <mesh key={i} position={[-0.95 + col * 0.95, 0.12 + h / 2, -0.7 + row * 0.7]} castShadow>
            <boxGeometry args={[0.7, h, 0.5]} />
            {mat(crit ? STAGE.clay : "#c9a46a", crit ? 0.35 + glow * 0.3 : glow * 0.12, { roughness: 0.8 })}
          </mesh>
        );
      })}
    </group>
  );
};

const Counter = ({ node, glow, reducedMotion }: { node: SystemNode; glow: number; reducedMotion: boolean }) => {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (reducedMotion || !ring.current) return;
    const t = (state.clock.elapsedTime * (0.5 + node.level)) % 1;
    ring.current.scale.setScalar(0.8 + t * 1.4);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
  });
  return (
    <group>
      <RoundedBox args={[2.8, 1, 1.1]} radius={0.1} position={[0, 0.5, 0]} castShadow>
        {mat(STAGE.wood, glow * 0.12, { roughness: 0.7 })}
      </RoundedBox>
      <RoundedBox args={[2.9, 0.08, 1.25]} radius={0.03} position={[0, 1.04, 0]}>
        {mat("#e8efe9", glow * 0.1, { roughness: 0.25, metalness: 0.2 })}
      </RoundedBox>
      <RoundedBox args={[0.6, 0.45, 0.45]} radius={0.06} position={[0.8, 1.32, 0]} castShadow>
        {mat("#1b2d24", 0)}
      </RoundedBox>
      <mesh position={[0.8, 1.5, 0.24]}>
        <planeGeometry args={[0.46, 0.22]} />
        <meshBasicMaterial color={STAGE.sprout} toneMapped={false} />
      </mesh>
      {/* toldo a rayas */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-1.25 + i * 0.5, 2.55, -0.15]} rotation-x={-0.35}>
          <boxGeometry args={[0.5, 0.06, 1.3]} />
          {mat(i % 2 ? "#f4faf6" : STAGE.leaf, glow * 0.2)}
        </mesh>
      ))}
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, 1.3, -0.5]}>
          <cylinderGeometry args={[0.05, 0.05, 2.6, 8]} />
          {mat(STAGE.metal)}
        </mesh>
      ))}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.03}>
        <ringGeometry args={[1.5, 1.62, 48]} />
        <meshBasicMaterial color={STAGE.sprout} transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
};

const House = ({ position, overdue, glow }: { position: [number, number, number]; overdue: boolean; glow: number }) => (
  <group position={position}>
    <mesh position-y={0.32} castShadow>
      <boxGeometry args={[0.62, 0.64, 0.62]} />
      {mat("#e7eee9", glow * 0.1)}
    </mesh>
    <mesh position-y={0.86} rotation-y={Math.PI / 4} castShadow>
      <coneGeometry args={[0.55, 0.45, 4]} />
      {mat(overdue ? STAGE.badSolid : STAGE.leaf, overdue ? 0.45 + glow * 0.3 : glow * 0.2)}
    </mesh>
    <mesh position={[0, 0.36, 0.312]}>
      <planeGeometry args={[0.18, 0.18]} />
      <meshBasicMaterial color={STAGE.harvest} toneMapped={false} />
    </mesh>
  </group>
);

const Customers = ({ node, glow }: { node: SystemNode; glow: number }) => {
  const n = Math.max(3, Math.min(9, node.count ?? 6));
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const r = i % 2 ? 1.25 : 0.85;
        return <House key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} overdue={i < (node.critical ?? 0)} glow={glow} />;
      })}
    </group>
  );
};

const Coins = ({ node, glow }: { node: SystemNode; glow: number }) => {
  const stacks = [0.55, 1, 0.75].map((f) => Math.max(2, Math.round((3 + node.level * 12) * f)));
  return (
    <group>
      {stacks.map((count, s) => (
        <group key={s} position={[(s - 1) * 0.9, 0, s === 1 ? -0.2 : 0.25]}>
          {Array.from({ length: count }, (_, i) => (
            <mesh key={i} position-y={0.07 + i * 0.13} rotation-y={i * 0.6} castShadow>
              <cylinderGeometry args={[0.38, 0.38, 0.11, 28]} />
              <meshStandardMaterial color={STAGE.harvest} emissive={STAGE.harvest} emissiveIntensity={0.12 + glow * 0.35} metalness={0.85} roughness={0.25} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/** La ampliación: un edificio holográfico; sólido y verde si conviene, translúcido y rojizo si no. */
const Expansion = ({ node, glow, reducedMotion }: { node: SystemNode; glow: number; reducedMotion: boolean }) => {
  const ref = useRef<THREE.Group>(null);
  const floors = Math.max(1, Math.round(1 + node.level * 3));
  const color = toneColor(node.tone);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[1.7, 1.8, 0.12, 6]} />
        {mat("#284a3b")}
      </mesh>
      {Array.from({ length: floors }, (_, i) => (
        <mesh key={i} position={[0, 0.55 + i * 0.85, 0]}>
          <boxGeometry args={[2.1 - i * 0.18, 0.78, 1.7 - i * 0.12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.25 + glow * 0.5}
            transparent
            opacity={node.tone === "bad" ? 0.22 : 0.42}
            roughness={0.1}
            metalness={0.4}
            depthWrite={false}
          />
          <Edges color={color} />
        </mesh>
      ))}
      {/* andamio: la obra aún no existe */}
      {[-1.15, 1.15].map((x) =>
        [-0.95, 0.95].map((z) => (
          <mesh key={`${x}${z}`} position={[x, (floors * 0.85) / 2 + 0.15, z]}>
            <cylinderGeometry args={[0.03, 0.03, floors * 0.85 + 0.3, 6]} />
            <meshBasicMaterial color={STAGE.muted} transparent opacity={0.6} />
          </mesh>
        )),
      )}
    </group>
  );
};

/** El SIG en el centro: núcleo de información que conecta todos los puntos. */
const Core = ({ glow, reducedMotion }: { glow: number; reducedMotion: boolean }) => {
  const gem = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    if (reducedMotion) return;
    if (gem.current) {
      gem.current.rotation.y += dt * 0.5;
      gem.current.position.y = 2.4 + Math.sin(state.clock.elapsedTime * 1.2) * 0.18;
    }
    if (ring.current) ring.current.rotation.z += dt * 0.35;
  });
  return (
    <group>
      <mesh position-y={0.1}>
        <cylinderGeometry args={[1.1, 1.3, 0.2, 32]} />
        {mat("#1d4a37", 0.2)}
      </mesh>
      <mesh position-y={1.2}>
        <cylinderGeometry args={[0.06, 0.18, 2.2, 12, 1, true]} />
        <meshBasicMaterial color={STAGE.sky} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={gem} position-y={2.4} castShadow>
        <icosahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial color={STAGE.sprout} emissive={STAGE.sprout} emissiveIntensity={0.45 + glow * 0.6} roughness={0.15} metalness={0.5} flatShading />
      </mesh>
      <mesh ref={ring} position-y={2.4} rotation-x={Math.PI / 2.4}>
        <torusGeometry args={[1.2, 0.025, 8, 80]} />
        <meshBasicMaterial color={STAGE.sky} toneMapped={false} />
      </mesh>
    </group>
  );
};

const LABEL_Y: Record<NodeKey, number> = { proveedores: 2.4, bodega: 4.1, mostrador: 3.3, clientes: 1.9, caja: 2.7, ampliacion: 4.3, sig: 3.7 };
const DISC_R: Record<NodeKey, number> = { proveedores: 1.9, bodega: 2.4, mostrador: 1.9, clientes: 1.9, caja: 1.5, ampliacion: 2.1, sig: 1.5 };

const NodeObject = ({ node, glow, reducedMotion }: { node: SystemNode; glow: number; reducedMotion: boolean }) => {
  switch (node.key) {
    case "proveedores":
      return <Truck glow={glow} />;
    case "bodega":
      return <Warehouse node={node} glow={glow} />;
    case "mostrador":
      return <Counter node={node} glow={glow} reducedMotion={reducedMotion} />;
    case "clientes":
      return <Customers node={node} glow={glow} />;
    case "caja":
      return <Coins node={node} glow={glow} />;
    case "ampliacion":
      return <Expansion node={node} glow={glow} reducedMotion={reducedMotion} />;
    default:
      return <Core glow={glow} reducedMotion={reducedMotion} />;
  }
};

const SceneContent = ({ nodes, flows, selected, onSelect, onOpen, tier, reducedMotion, narrow }: SystemMapSceneProps) => {
  const vec = useMemo(() => Object.fromEntries(Object.entries(NODE_POS).map(([k, p]) => [k, new THREE.Vector3(p[0], 0.6, p[2])])) as Record<NodeKey, THREE.Vector3>, []);
  return (
    <>
      <SceneCamera view={viewFor(selected, narrow)} home={narrow ? HOME_NARROW : HOME_VIEW} reducedMotion={reducedMotion} narrow={narrow} minDistance={6} maxDistance={28} />
      <Platform radius={11} tier={tier} />
      {/* clic en el suelo vacío = volver a la vista general */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05} onClick={() => onSelect(null)} visible={false}>
        <circleGeometry args={[30, 16]} />
        <meshBasicMaterial />
      </mesh>
      {flows.map((f, i) => {
        const related = selected === null ? null : f.from === selected || f.to === selected;
        return (
          <Flow
            key={i}
            from={vec[f.from]}
            to={vec[f.to]}
            color={FLOW_COLOR[f.kind]}
            intensity={f.intensity}
            lift={f.kind === "informacion" ? 1.2 : 2.4}
            dashed={f.kind === "informacion"}
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
          <group key={n.key}>
            <Hoverable
              position={NODE_POS[n.key]}
              selected={isSel}
              dimmed={dim}
              reducedMotion={reducedMotion}
              onSelect={() => onSelect(isSel ? null : n.key)}
              onOpen={() => onOpen(n.key)}
            >
              {({ hovered }) => (
                <>
                  <SelectionDisc radius={DISC_R[n.key]} active={isSel || hovered} color={n.alert ? STAGE.harvest : STAGE.sprout} />
                  <NodeObject node={n} glow={isSel ? 1 : hovered ? 0.6 : 0} reducedMotion={reducedMotion} />
                  {n.alert ? (
                    <group position={[DISC_R[n.key] * 0.75, 0, -DISC_R[n.key] * 0.4]}>
                      <Beacon color={n.tone === "bad" ? STAGE.bad : STAGE.harvest} reducedMotion={reducedMotion} height={2.6} />
                    </group>
                  ) : null}
                  <Label position={[0, LABEL_Y[n.key], 0]} title={n.title} value={n.metrics[0]?.value} hot={isSel || hovered} dim={dim} tone={n.tone} />
                </>
              )}
            </Hoverable>
          </group>
        );
      })}
    </>
  );
};

/** Mapa vivo del negocio: proveedores → bodega → mostrador → clientes → caja → decisión, con el SIG en el centro. */
const SystemMapScene = (props: SystemMapSceneProps) => (
  <StageCanvas tier={props.tier} reducedMotion={props.reducedMotion} camera={{ position: [...HOME.pos], fov: 38 }} label="Mapa 3D del negocio con sus flujos de mercancía, dinero e información">
    <SceneContent {...props} />
  </StageCanvas>
);

export default SystemMapScene;
