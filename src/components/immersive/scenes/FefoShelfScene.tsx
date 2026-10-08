import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { STAGE } from "../palette";
import type { Tier } from "../useImmersive";
import { Beacon, Hoverable, Platform, SceneCamera, StageCanvas, StageHtml, damp } from "./kit";
import styles from "./SceneLabel.module.css";

export type ShelfBox = { id: number; product: string; days: number; expired: boolean; remaining: number; quantity: number };
export type ShelfRow = { key: string; label: string; color: string; boxes: ShelfBox[] };

export type FefoShelfSceneProps = {
  rows: ShelfRow[];
  selected: number | null;
  onSelect: (id: number | null) => void;
  /** Lote que sale en la simulación de venta (se desliza hacia el mostrador). */
  leaving: number | null;
  tier: Tier;
  reducedMotion: boolean;
  narrow: boolean;
};

const ROW_GAP = 2.1;
const BOX_W = 1;
const SLOT = 1.25;

/** Posición de cada caja: la fila 0 (más cerca de la cámara) es la que sale primero. */
const layout = (rows: ShelfRow[]) => {
  const out = new Map<number, { x: number; z: number; row: number }>();
  rows.forEach((r, ri) => {
    const n = r.boxes.length;
    r.boxes.forEach((b, i) => out.set(b.id, { x: (i - (n - 1) / 2) * SLOT, z: 3 - ri * ROW_GAP, row: ri }));
  });
  return out;
};

const Box = ({
  box,
  color,
  pos,
  selected,
  dimmed,
  leaving,
  onSelect,
  reducedMotion,
}: {
  box: ShelfBox;
  color: string;
  pos: { x: number; z: number };
  selected: boolean;
  dimmed: boolean;
  leaving: boolean;
  onSelect: () => void;
  reducedMotion: boolean;
}) => {
  const h = 0.35 + (box.quantity > 0 ? box.remaining / box.quantity : 0) * 1.1;
  const slide = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!slide.current) return;
    const tz = leaving ? 4.5 : 0;
    slide.current.position.z = reducedMotion ? tz : damp(slide.current.position.z, tz, 2.2, dt);
    const s = leaving ? 0.001 : 1;
    const k = reducedMotion ? s : damp(slide.current.scale.x, s, leaving ? 1.6 : 8, dt);
    slide.current.scale.setScalar(Math.max(k, 0.001));
  });
  return (
    <Hoverable position={[pos.x, 0.32, pos.z]} selected={selected} dimmed={dimmed} reducedMotion={reducedMotion} onSelect={onSelect}>
      {({ hovered }) => (
        <group ref={slide}>
          <group rotation-z={box.expired ? 0.12 : 0}>
            <RoundedBox args={[BOX_W, h, 0.8]} radius={0.06} position-y={h / 2} castShadow>
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={selected ? 0.55 : hovered ? 0.35 : dimmed ? 0.02 : 0.12}
                roughness={0.6}
                transparent={dimmed}
                opacity={dimmed ? 0.35 : 1}
              />
            </RoundedBox>
            {/* cinta de embalaje */}
            <mesh position={[0, h + 0.002, 0]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.16, 0.8]} />
              <meshBasicMaterial color="#f4faf6" transparent opacity={dimmed ? 0.2 : 0.55} />
            </mesh>
          </group>
          {box.expired && !dimmed ? <Beacon color={STAGE.bad} height={2.2} reducedMotion={reducedMotion} /> : null}
          {hovered || selected ? (
            <StageHtml position={[0, h + 0.75, 0]}>
              <div className={styles.tip}>
                {box.product} · #{box.id} · {box.expired ? "vencido" : `${box.days} d`}
              </div>
            </StageHtml>
          ) : null}
        </group>
      )}
    </Hoverable>
  );
};

const focus = (t: { x: number; z: number }, narrow: boolean) => {
  const shift = narrow ? 0 : 1.6;
  return { pos: [t.x + shift, 3.6, t.z + 5.2] as [number, number, number], target: [t.x + shift, 0.6, t.z] as [number, number, number] };
};

const Content = ({ rows, selected, onSelect, leaving, tier, reducedMotion, narrow }: FefoShelfSceneProps) => {
  const pos = useMemo(() => layout(rows), [rows]);
  const widest = Math.max(4, ...rows.map((r) => r.boxes.length)) * SLOT;
  const target = selected !== null ? pos.get(selected) : undefined;
  const home = useMemo(() => {
    const d = Math.max(narrow ? 10 : 7.2, widest * 0.72);
    return { pos: [0, d * 0.78, d * 1.12] as [number, number, number], target: [0, 0.2, -0.4] as [number, number, number] };
  }, [widest, narrow]);
  return (
    <>
      <SceneCamera view={target ? focus(target, narrow) : home} home={home} reducedMotion={reducedMotion} narrow={narrow} minDistance={4} maxDistance={30} />
      <Platform radius={Math.max(9, widest / 2 + 3)} tier={tier} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05} onClick={() => onSelect(null)} visible={false}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial />
      </mesh>
      {/* franja del frente: por aquí sale la mercancía hacia el mostrador */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 4.6]}>
        <planeGeometry args={[widest + 2, 0.5]} />
        <meshBasicMaterial color={STAGE.sprout} transparent opacity={0.35} />
      </mesh>
      <StageHtml position={[0, 0.1, 5.3]}>
        <div className={styles.tip}>↓ Frente del estante · sale primero</div>
      </StageHtml>
      {rows.map((r, ri) => {
        const z = 3 - ri * ROW_GAP;
        return (
          <group key={r.key}>
            {/* tablón del estante, con el color de la ventana de vencimiento */}
            <RoundedBox args={[widest + 1.2, 0.18, 1.3]} radius={0.05} position={[0, 0.16, z]} receiveShadow>
              <meshStandardMaterial color={STAGE.wood} roughness={0.8} />
            </RoundedBox>
            <mesh position={[0, 0.26, z + 0.66]}>
              <boxGeometry args={[widest + 1.2, 0.05, 0.03]} />
              <meshBasicMaterial color={r.color} toneMapped={false} />
            </mesh>
            {narrow ? null : (
            <StageHtml position={[-(widest / 2) - 1.3, 0.6, z]}>
              <div className={styles.label}>
                <span className={styles.title}>
                  <span className={styles.dot} style={{ background: r.color }} />
                  {r.label}
                </span>
                <span className={styles.value}>{r.boxes.length === 1 ? "1 lote" : `${r.boxes.length} lotes`}</span>
              </div>
            </StageHtml>
            )}
            {r.boxes.map((b) => (
              <Box
                key={b.id}
                box={b}
                color={r.color}
                pos={pos.get(b.id)!}
                selected={selected === b.id}
                dimmed={selected !== null && selected !== b.id}
                leaving={leaving === b.id}
                onSelect={() => onSelect(selected === b.id ? null : b.id)}
                reducedMotion={reducedMotion}
              />
            ))}
          </group>
        );
      })}
    </>
  );
};

/** Estante FEFO en 3D: cada caja es un lote; las filas van del frente (vence primero) al fondo. */
const FefoShelfScene = (props: FefoShelfSceneProps) => (
  <StageCanvas tier={props.tier} reducedMotion={props.reducedMotion} camera={{ position: [0, 9, 13], fov: 40 }} label="Estante 3D de lotes ordenados por fecha de vencimiento" fogFar={60}>
    <Content {...props} />
  </StageCanvas>
);

export default FefoShelfScene;
