import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Tier } from "../useImmersive";
import { Ground, Hoverable, SceneCamera, StageCanvas, StageHtml, damp } from "./kit";
import { Model, ModelInstances, preloadModels } from "./assets";
import styles from "./SceneLabel.module.css";

preloadModels(["worn_metal_rack","cardboard_box_01","sack_bovino","hand_truck","plastic_crate_01"]);

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

/*
 * Bodega real a escala 1:1 (metros): estanterías metálicas escaneadas, una fila por ventana de vencimiento.
 * La fila del frente es la que sale primero (FEFO). Cada caja de cartón es un lote; su etiqueta muestra el
 * número de lote, el producto, los días que le quedan y una barra con las unidades restantes.
 */
const P = 1.6; // los modelos se cargan a escala de maqueta (1/1,6); aquí se devuelven a 1:1
const RACK_W = 0.92;
const BAND_GAP = 0.7;
const PER_UNIT = 4; // dos cajas en el entrepaño de 0,42 m y dos en el de 0,92 m
const SHELF_Y = [0.43, 0.93];

type Slot = { x: number; y: number; z: number; row: number };

/**
 * Las ventanas de vencimiento quedan una al lado de la otra frente a la cámara: a la izquierda, junto a la
 * salida hacia el mostrador, lo que vence primero; a la derecha, lo que vence de último.
 */
const bandsLayout = (rows: ShelfRow[]) => {
  const units = rows.map((r) => Math.max(1, Math.ceil(r.boxes.length / PER_UNIT)));
  const total = units.reduce((a, u) => a + u * RACK_W, 0) + BAND_GAP * Math.max(0, rows.length - 1);
  let x = -total / 2;
  const bands = rows.map((_, i) => {
    const w = units[i]! * RACK_W;
    const b = { x0: x, w, units: units[i]!, cx: x + w / 2 };
    x += w + BAND_GAP;
    return b;
  });
  return { bands, total };
};

const layout = (rows: ShelfRow[]) => {
  const out = new Map<number, Slot>();
  const { bands } = bandsLayout(rows);
  rows.forEach((r, ri) => {
    const band = bands[ri]!;
    r.boxes.forEach((b, i) => {
      const u = Math.floor(i / PER_UNIT);
      const k = i % PER_UNIT;
      out.set(b.id, { x: band.x0 + RACK_W / 2 + u * RACK_W + (k % 2 ? 0.22 : -0.22), y: SHELF_Y[k < 2 ? 1 : 0]!, z: 0, row: ri });
    });
  });
  return out;
};

/** Etiqueta de lote impresa (lienzo): franja con el color de la ventana, número, producto, días y existencias. */
const useLotTag = (box: ShelfBox, color: string) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 160;
    const x = c.getContext("2d")!;
    x.fillStyle = "#f7f5ef";
    x.fillRect(0, 0, 256, 160);
    x.fillStyle = color;
    x.fillRect(0, 0, 256, 34);
    x.fillStyle = "#ffffff";
    x.font = "800 22px 'Plus Jakarta Sans Variable', system-ui, sans-serif";
    x.fillText(box.expired ? "VENCIDO" : `${box.days} DÍAS`, 12, 25);
    x.fillStyle = "#1b1f1c";
    x.font = "800 30px 'Plus Jakarta Sans Variable', system-ui, sans-serif";
    x.fillText(`LOTE #${box.id}`, 12, 72);
    x.font = "600 19px 'Plus Jakarta Sans Variable', system-ui, sans-serif";
    let name = box.product;
    while (x.measureText(name).width > 232 && name.length > 4) name = name.slice(0, -2);
    x.fillText(name === box.product ? name : `${name}…`, 12, 100);
    const f = box.quantity > 0 ? box.remaining / box.quantity : 0;
    x.fillStyle = "#dedbd2";
    x.fillRect(12, 122, 232, 14);
    x.fillStyle = color;
    x.fillRect(12, 122, 232 * f, 14);
    x.fillStyle = "#47534c";
    x.font = "600 13px 'Plus Jakarta Sans Variable', system-ui, sans-serif";
    x.fillText(`${box.remaining} de ${box.quantity} u`, 12, 154);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [box, color]);

/** Cinta roja y blanca de cuarentena cruzada sobre la caja vencida. */
const tapeTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 24;
    const x = c.getContext("2d")!;
    for (let i = -1; i < 10; i++) {
      x.fillStyle = i % 2 ? "#f1eee6" : "#c62f22";
      x.beginPath();
      x.moveTo(i * 28, 0);
      x.lineTo(i * 28 + 28, 0);
      x.lineTo(i * 28 + 14, 24);
      x.lineTo(i * 28 - 14, 24);
      x.fill();
    }
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  };
})();

const Lot = ({
  box,
  color,
  slot,
  selected,
  dimmed,
  leaving,
  onSelect,
  reducedMotion,
}: {
  box: ShelfBox;
  color: string;
  slot: Slot;
  selected: boolean;
  dimmed: boolean;
  leaving: boolean;
  onSelect: () => void;
  reducedMotion: boolean;
}) => {
  const tag = useLotTag(box, color);
  const slide = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = slide.current;
    if (!g) return;
    const tz = leaving ? 2.6 : selected ? 0.32 : 0;
    g.position.z = reducedMotion ? tz : damp(g.position.z, tz, leaving ? 1.8 : 7, dt);
    const s = leaving ? 0.001 : 1;
    g.scale.setScalar(Math.max(0.001, reducedMotion ? s : damp(g.scale.x, s, leaving ? 1.4 : 8, dt)));
  });
  return (
    <Hoverable position={[slot.x, slot.y, slot.z]} selected={selected} dimmed={dimmed} reducedMotion={reducedMotion} onSelect={onSelect} lift>
      {({ hovered }) => (
        <group ref={slide}>
          <group rotation-z={box.expired ? 0.1 : 0} rotation-y={((box.id * 7) % 5) * 0.03 - 0.06}>
            <Model name="cardboard_box_01" scale={P * 0.95} />
            {/* etiqueta pegada en la cara frontal */}
            <mesh position={[0, 0.17, 0.285]}>
              <planeGeometry args={[0.27, 0.17]} />
              <meshStandardMaterial map={tag} roughness={0.55} transparent={dimmed} opacity={dimmed ? 0.55 : 1} />
            </mesh>
            {box.expired ? (
              <>
                <mesh position={[0, 0.17, 0.287]} rotation-z={0.55}>
                  <planeGeometry args={[0.5, 0.045]} />
                  <meshStandardMaterial map={tapeTex()} roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.17, 0.288]} rotation-z={-0.55}>
                  <planeGeometry args={[0.5, 0.045]} />
                  <meshStandardMaterial map={tapeTex()} roughness={0.5} />
                </mesh>
              </>
            ) : null}
          </group>
          {hovered || selected ? (
            <StageHtml position={[0, 0.62, 0.1]}>
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

/** Franja de demarcación pintada en el piso (como en las bodegas reales), con el color de la ventana. */
const FloorMark = ({ width, z, color, x = 0 }: { width: number; z: number; color: string; x?: number }) => (
  <mesh rotation-x={-Math.PI / 2} position={[x, 0.004, z]} receiveShadow>
    <planeGeometry args={[width, 0.09]} />
    <meshStandardMaterial color={color} roughness={0.75} />
  </mesh>
);

const focus = (s: Slot, narrow: boolean) => {
  const shift = narrow ? 0 : 0.75;
  return { pos: [s.x + shift, s.y + 0.9, s.z + 2.5] as [number, number, number], target: [s.x + shift, s.y + 0.15, s.z] as [number, number, number] };
};

const Content = ({ rows, selected, onSelect, leaving, reducedMotion, narrow }: FefoShelfSceneProps) => {
  const pos = useMemo(() => layout(rows), [rows]);
  const { bands, total } = useMemo(() => bandsLayout(rows), [rows]);
  const target = selected !== null ? pos.get(selected) : undefined;
  const home = useMemo(() => {
    const d = Math.max(narrow ? 4.8 : 3.4, total * (narrow ? 1.45 : 0.82));
    return { pos: [0.25, 1.5 + d * 0.22, d] as [number, number, number], target: [0, 1.12, 0] as [number, number, number] };
  }, [total, narrow]);
  const racks = useMemo(
    () => bands.flatMap((b) => Array.from({ length: b.units }, (_, u) => ({ p: [b.x0 + RACK_W / 2 + u * RACK_W, 0, 0] as [number, number, number], r: 0, s: P }))),
    [bands],
  );
  const left = -total / 2;
  const right = total / 2;
  return (
    <>
      <SceneCamera view={target ? focus(target, narrow) : home} home={home} reducedMotion={reducedMotion} narrow={narrow} minDistance={1.4} maxDistance={14} />
      <Ground radius={14} material="concrete" texSize={3} onMiss={() => onSelect(null)} />
      <ModelInstances name="worn_metal_rack" items={racks} />
      {/* salida hacia el mostrador (izquierda) y utilería de bodega */}
      <FloorMark width={0.9} z={0.9} color="#e3a33b" x={left - 0.75} />
      <StageHtml position={[left - 0.2, 0.08, 1.15]}>
        <div className={styles.tip}>← Salida al mostrador · sale primero</div>
      </StageHtml>
      <ModelInstances name="sack_bovino" items={[0, 1, 2, 3].map((l) => ({ p: [left - 0.75, l * 0.165, -0.15] as [number, number, number], r: Math.PI / 2 + (l % 2) * 0.08, s: P }))} />
      <Model name="hand_truck" at={[right + 0.65, 0, 0.35]} rot={-0.7} scale={P} />
      <ModelInstances name="plastic_crate_01" items={[{ p: [right + 0.6, 0, -0.35], r: 0.2, s: P }, { p: [right + 0.62, 0.26, -0.33], r: 0.1, s: P }]} />
      {rows.map((r, ri) => {
        const band = bands[ri]!;
        return (
          <group key={r.key}>
            <FloorMark width={band.w + 0.1} z={0.42} color={r.color} x={band.cx} />
            <StageHtml position={[band.cx, 2.12, 0]}>
              <div className={styles.label}>
                <span className={styles.title}>
                  <span className={styles.dot} style={{ background: r.color }} />
                  {r.label}
                </span>
                {narrow ? null : <span className={styles.value}>{r.boxes.length === 1 ? "1 lote" : `${r.boxes.length} lotes`}</span>}
              </div>
            </StageHtml>
            {r.boxes.map((b) => (
              <Lot
                key={b.id}
                box={b}
                color={r.color}
                slot={pos.get(b.id)!}
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

/** Estante FEFO en 3D: bodega real con estanterías; cada caja es un lote y la fila del frente vence primero. */
const FefoShelfScene = (props: FefoShelfSceneProps) => (
  <StageCanvas
    tier={props.tier}
    reducedMotion={props.reducedMotion}
    camera={{ position: [0, 3.2, 7], fov: 40 }}
    env="warehouse"
    envIntensity={1.1}
    backgroundBlur={0.55}
    sun={[3, 7, 6]}
    sunColor="#fff4e2"
    sunIntensity={1.6}
    shadowBox={8}
    label="Bodega 3D: estanterías con los lotes ordenados por fecha de vencimiento"
  >
    <Content {...props} />
  </StageCanvas>
);

export default FefoShelfScene;
