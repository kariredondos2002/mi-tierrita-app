import { useLayoutEffect, useMemo, useRef } from "react";
import TREE_LEAVES from "./treeLeaves.json";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { box, cyl, gable, merge, palletGeometry, roofSheet, tireGeometry } from "./geometry";
import { Pbr, useColorTex, usePbr } from "./materials";
import { Model, ModelInstances } from "./assets";

/** Los objetos escaneados se muestran a escala real (1 unidad = 1 m); los edificios, a escala de maqueta. */
const P = 1.6;

/*
 * Modelos de la maqueta de Agropecuaria Mi Tierrita (Sahagún, Córdoba), construidos a mano con geometría
 * propia y texturas PBR: bodega de bloque pañetado con cubierta de zinc, local con letrero y alero, camión
 * de estacas, fincas con techo de teja, obra de la ampliación, caja y oficina del SIG.
 * Escala aproximada de maqueta: 1 unidad ≈ 1,6 m.
 */

const GLASS = { color: "#20303a", metalness: 0.1, roughness: 0.05, envMapIntensity: 1.6 } as const;
const IRON = { color: "#2b2e30", metalness: 0.7, roughness: 0.45 } as const;

/* ------------------------------------------------------------------ básicos */

/** Ventana con marco, vidrio y reja de hierro (típica de la región). */
export const Window = ({ w = 0.7, h = 0.6, at, rotY = 0 }: { w?: number; h?: number; at: [number, number, number]; rotY?: number }) => {
  const bars = useMemo(() => merge(Array.from({ length: 5 }, (_, i) => box(0.018, h - 0.04, 0.018, [-w / 2 + ((i + 1) * w) / 6, 0, 0.05]))), [w, h]);
  return (
    <group position={at} rotation-y={rotY}>
      <mesh castShadow geometry={useMemo(() => box(w + 0.08, h + 0.08, 0.06), [w, h])}>
        <meshStandardMaterial color="#ece9e0" roughness={0.7} />
      </mesh>
      <mesh position-z={0.02}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <mesh geometry={bars}>
        <meshStandardMaterial {...IRON} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.06, 0.06]} geometry={useMemo(() => box(w + 0.16, 0.05, 0.14), [w])}>
        <meshStandardMaterial color="#d9d4c7" roughness={0.8} />
      </mesh>
    </group>
  );
};

/** Costales reales (escaneo de un bulto de papel multicapa con la etiqueta del producto), instanciados. */
export const SackStack = ({
  positions,
  kind = "bovino",
}: {
  positions: { p: [number, number, number]; r: number }[];
  kind?: "bovino" | "sal" | "urea";
}) => <ModelInstances name={`sack_${kind}`} items={useMemo(() => positions.map((q) => ({ p: q.p, r: q.r, s: P })), [positions])} />;

/** Una estiba con `layers` capas de costales en amarre cruzado (5 por capa). */
export const PalletOfSacks = ({ at, layers, kind, rot = 0, tag }: { at: [number, number, number]; layers: number; kind?: "bovino" | "sal" | "urea"; rot?: number; tag?: "expired" }) => {
  const pallet = useMemo(() => palletGeometry(), []);
  const wood = usePbr("wood", 1, 1);
  const sacks = useMemo(() => {
    // amarre cruzado: dos bultos a lo largo y uno atravesado, alternando el lado en cada capa
    const out: { p: [number, number, number]; r: number }[] = [];
    for (let l = 0; l < layers; l++) {
      const y = 0.144 + l * 0.165;
      const s = l % 2 ? -1 : 1;
      const j = ((l * 7) % 5) * 0.012;
      out.push({ p: [-0.245, y, -0.24 * s], r: j });
      out.push({ p: [0.245, y, -0.24 * s], r: Math.PI - j });
      out.push({ p: [0, y, 0.36 * s], r: Math.PI / 2 + j });
    }
    return out;
  }, [layers]);
  return (
    <group position={at} rotation-y={rot}>
      <mesh geometry={pallet} castShadow receiveShadow>
        <meshStandardMaterial {...wood} roughness={0.85} />
      </mesh>
      {layers > 0 ? <SackStack positions={sacks} kind={kind} /> : null}
      {tag === "expired" ? <QuarantineTape h={0.15 + layers * 0.165} /> : null}
    </group>
  );
};

/** Cinta de cuarentena roja y blanca alrededor de mercancía vencida. */
const QuarantineTape = ({ h }: { h: number }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 32;
    const x = c.getContext("2d")!;
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? "#f4f1ea" : "#c62f22";
      x.beginPath();
      x.moveTo(i * 32, 0);
      x.lineTo(i * 32 + 32, 0);
      x.lineTo(i * 32 + 16, 32);
      x.lineTo(i * 32 - 16, 32);
      x.fill();
    }
    x.fillStyle = "#1a1a1a";
    x.font = "bold 18px sans-serif";
    x.fillText("VENCIDO", 92, 23);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    return t;
  }, []);
  return (
    <mesh position-y={h * 0.6}>
      <cylinderGeometry args={[0.74, 0.74, 0.07, 32, 1, true]} />
      <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.6} />
    </mesh>
  );
};

/* ------------------------------------------------------------------ edificios */

type BuildingProps = {
  w: number;
  d: number;
  h: number;
  ridge?: number;
  wall?: "plaster_cream" | "plaster_white" | "plaster_green";
  roof?: "zinc" | "tiles";
  overhang?: number;
};

/** Cuerpo de edificio con techo a dos aguas (cumbrera paralela a x). */
export const Building = ({ w, d, h, ridge = 0.7, wall = "plaster_cream", roof = "zinc", overhang = 0.22 }: BuildingProps) => {
  const walls = useMemo(() => merge([box(w, h, d, [0, h / 2, 0], 2), gable(d, ridge, w, h).rotateY(Math.PI / 2)]), [w, d, h, ridge]);
  const base = useMemo(() => box(w + 0.06, 0.16, d + 0.06, [0, 0.08, 0], 1), [w, d]);
  const slope = Math.hypot(d / 2 + overhang, ridge + (overhang * ridge) / (d / 2));
  const ang = Math.atan2(ridge, d / 2);
  const sheet = useMemo(() => roofSheet(w + overhang * 2, slope), [w, overhang, slope]);
  const fascia = useMemo(() => box(w + overhang * 2, 0.08, 0.03), [w, overhang]);
  return (
    <group>
      <mesh geometry={walls} castShadow receiveShadow>
        <Pbr name={wall} repeat={[1, 1]} roughness={0.95} normalScale={0.6} />
      </mesh>
      <mesh geometry={base} receiveShadow>
        <Pbr name="concrete" repeat={[0.6, 0.6]} color="#b9b4a8" />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s} position={[0, h + ridge / 2 - 0.02, (s * (d / 2)) / 2]} rotation-x={s * ang}>
          <mesh geometry={sheet} castShadow receiveShadow position-y={0.028} position-z={(s * (slope - Math.hypot(d / 2, ridge))) / 2}>
            {roof === "zinc" ? <Pbr name="zinc" repeat={[1, 1]} metalness={0.35} roughness={0.9} side={THREE.DoubleSide} color="#c9cdd0" /> : <Pbr name="tiles" repeat={[0.7, 0.7]} normalScale={1.4} side={THREE.DoubleSide} />}
          </mesh>
        </group>
      ))}
      {[1, -1].map((s) => (
        <mesh key={`f${s}`} geometry={fascia} position={[0, h - (overhang * ridge) / (d / 2) + 0.01, s * (d / 2 + overhang)]}>
          <meshStandardMaterial color={roof === "zinc" ? "#2c6a4e" : "#efe9dc"} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
};

/** Puerta enrollable metálica (abierta `open` de 0 a 1). */
const RollerDoor = ({ w, h, at, open = 0 }: { w: number; h: number; at: [number, number, number]; open?: number }) => {
  const shown = h * (1 - open);
  return (
    <group position={at}>
      <mesh position={[0, h / 2, -0.01]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#121312" roughness={1} />
      </mesh>
      {shown > 0.02 ? (
        <mesh position={[0, h - shown / 2, 0.012]} geometry={useMemo(() => box(w, shown, 0.02, [0, 0, 0], 1.4), [w, shown])}>
          <Pbr name="door" repeat={[1, 1]} metalness={0.6} roughness={0.9} />
        </mesh>
      ) : null}
      <mesh position={[0, h + 0.09, 0.05]} geometry={useMemo(() => box(w + 0.1, 0.18, 0.16), [w])}>
        <meshStandardMaterial color="#7e8487" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
};

/** Bodega: galpón de bloque pañetado, cubierta de zinc, puerta enrollable abierta y estibas al frente. */
export const WarehouseModel = ({ stacks, height, critical }: { stacks: number; height: number; critical: number }) => {
  const layers = Math.max(1, Math.min(6, Math.round(1 + height * 5)));
  const spots: [number, number, number][] = [
    [-1.05, 0, 1.9],
    [0.15, 0, 2.05],
    [1.3, 0, 1.85],
    [-1.6, 0, 3.15],
    [-0.4, 0, 3.3],
    [0.85, 0, 3.25],
    [2.05, 0, 3.0],
    [-1.0, 0, 4.4],
    [0.3, 0, 4.5],
  ];
  return (
    <group>
      <group position-z={-0.4}>
        <Building w={4.6} d={3.2} h={2.1} ridge={0.75} wall="plaster_white" />
        <RollerDoor w={1.7} h={1.55} at={[-0.4, 0.16, 1.61]} open={0.82} />
        <Window at={[1.45, 1.25, 1.62]} w={0.75} h={0.5} />
        <Window at={[2.31, 1.25, 0]} w={0.9} h={0.5} rotY={Math.PI / 2} />
        <SignBoard at={[-0.4, 1.95, 1.64]} w={1.6} h={0.26} text="BODEGA" />
      </group>
      {/* andén de concreto */}
      <mesh position={[0.3, 0.03, 3.2]} receiveShadow geometry={useMemo(() => box(5.4, 0.06, 3.6, [0, 0, 0], 2), [])}>
        <Pbr name="concrete" repeat={[1, 1]} />
      </mesh>
      {spots.slice(0, stacks).map((p, i) => (
        <PalletOfSacks key={i} at={[p[0], 0.06, p[2]]} layers={i < critical ? Math.max(1, layers - 2) : layers - (i % 3 === 2 ? 1 : 0)} kind={i % 4 === 3 ? "sal" : i % 5 === 4 ? "urea" : "bovino"} rot={((i * 37) % 10) / 60 - 0.08} tag={i < critical ? "expired" : undefined} />
      ))}
    </group>
  );
};

/** Letrero pintado (texto en textura de lienzo). */
export const SignBoard = ({ at, w, h, text, bg = "#1d4a37", fg = "#f6f1e4", rotY = 0 }: { at: [number, number, number]; w: number; h: number; text: string; bg?: string; fg?: string; rotY?: number }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    const k = 256;
    c.width = Math.round((w / h) * k);
    c.height = k;
    const x = c.getContext("2d")!;
    x.fillStyle = bg;
    x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = "#e3a33b";
    x.lineWidth = 10;
    x.strokeRect(8, 8, c.width - 16, c.height - 16);
    x.fillStyle = fg;
    let size = k * 0.62;
    x.font = `800 ${size}px "Plus Jakarta Sans Variable", system-ui, sans-serif`;
    while (x.measureText(text).width > c.width * 0.88 && size > 20) {
      size -= 4;
      x.font = `800 ${size}px "Plus Jakarta Sans Variable", system-ui, sans-serif`;
    }
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, c.width / 2, c.height / 2 + 6);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [w, h, text, bg, fg]);
  return (
    <mesh position={at} rotation-y={rotY} castShadow>
      <boxGeometry args={[w, h, 0.03]} />
      <meshStandardMaterial attach="material-0" color={bg} />
      <meshStandardMaterial attach="material-1" color={bg} />
      <meshStandardMaterial attach="material-2" color={bg} />
      <meshStandardMaterial attach="material-3" color={bg} />
      <meshStandardMaterial attach="material-4" map={tex} roughness={0.55} />
      <meshStandardMaterial attach="material-5" color={bg} />
    </mesh>
  );
};

/** Local de ventas: fachada con letrero, alero de zinc sobre columnas, mostrador y bultos exhibidos. */
export const StorefrontModel = ({ activity }: { activity: number }) => {
  const sign = useColorTex("sign_c.webp");
  const posts = useMemo(() => merge([-1.9, -0.65, 0.65, 1.9].map((x) => cyl(0.045, 0.045, 1.9, 10, [x, 0.95, 2.05]))), []);
  const lean = useMemo(() => roofSheet(4.4, 1.25), []);
  const counter = useMemo(() => merge([box(2.2, 0.62, 0.45, [0, 0.31, 0], 1), box(2.3, 0.04, 0.55, [0, 0.64, 0], 1)]), []);
  return (
    <group>
      <Building w={4.4} d={2.6} h={2.15} ridge={0.55} wall="plaster_green" />
      {/* fachada abierta: vano oscuro con mostrador */}
      <mesh position={[0, 0.98, 1.305]}>
        <planeGeometry args={[2.6, 1.6]} />
        <meshStandardMaterial color="#1a1612" roughness={1} />
      </mesh>
      <mesh geometry={counter} position={[0, 0.16, 1.05]} castShadow>
        <Pbr name="wood" repeat={[1.4, 1.4]} roughness={0.7} />
      </mesh>
      {/* estantería del fondo con productos (sugerida) */}
      {[0.55, 0.95, 1.35].map((y) => (
        <mesh key={y} position={[0, y, 0.45]}>
          <boxGeometry args={[2.4, 0.03, 0.3]} />
          <meshStandardMaterial color="#6b4a2e" roughness={0.8} />
        </mesh>
      ))}
      <ModelInstances name="plastic_bottle_gallon" items={useMemo(() => Array.from({ length: 13 }, (_, i) => ({ p: [-1.08 + i * 0.18, 0.565, 0.47] as [number, number, number], r: (i % 3) * 0.3, s: P * 0.85 })), [])} />
      <ModelInstances name="bleach_bottle" items={useMemo(() => Array.from({ length: 20 }, (_, i) => ({ p: [-1.1 + i * 0.116, 0.965, 0.47] as [number, number, number], r: (i % 4) * 0.2, s: P * 0.8 })), [])} />
      <ModelInstances name="multi_cleaner_bottle" items={useMemo(() => Array.from({ length: 22 }, (_, i) => ({ p: [-1.1 + i * 0.105, 1.365, 0.47] as [number, number, number], r: (i % 5) * 0.25, s: P * 0.85 })), [])} />
      {/* exhibición en el andén: estante de madera, regadera, matas y botiquín veterinario */}
      <Model name="wooden_display_shelves_01" at={[-2.0, 0.08, 2.2]} rot={Math.PI / 2} scale={P * 0.85} />
      <Model name="potted_plant_02" at={[2.05, 0.08, 2.45]} scale={P * 0.8} />
      <Model name="planter_box_01" at={[-0.2, 0.08, 2.55]} scale={P * 0.8} />
      <Model name="watering_can_metal_01" at={[0.55, 0.08, 2.5]} rot={0.8} scale={P} />
      {/* letrero principal */}
      <mesh position={[0, 2.38, 1.36]} castShadow>
        <boxGeometry args={[4.2, 0.62, 0.05]} />
        <meshStandardMaterial attach="material-0" color="#1d4a37" />
        <meshStandardMaterial attach="material-1" color="#1d4a37" />
        <meshStandardMaterial attach="material-2" color="#1d4a37" />
        <meshStandardMaterial attach="material-3" color="#1d4a37" />
        <meshStandardMaterial attach="material-4" map={sign} roughness={0.5} />
        <meshStandardMaterial attach="material-5" color="#1d4a37" />
      </mesh>
      {/* alero */}
      <mesh geometry={posts} castShadow>
        <meshStandardMaterial color="#e8e4da" metalness={0.3} roughness={0.5} />
      </mesh>
      <group position={[0, 1.98, 1.7]} rotation-x={0.16}>
        <mesh geometry={lean} castShadow receiveShadow>
          <Pbr name="zinc" metalness={0.35} roughness={0.9} side={THREE.DoubleSide} color="#c9cdd0" />
        </mesh>
      </group>
      {/* piso del andén */}
      <mesh position={[0, 0.04, 1.95]} receiveShadow geometry={useMemo(() => box(4.6, 0.08, 1.4, [0, 0, 0], 1.5), [])}>
        <Pbr name="concrete" color="#c9c3b5" />
      </mesh>
      {/* bultos exhibidos al frente (más ventas = más mercancía en exhibición) */}
      <PalletOfSacks at={[-1.35, 0.08, 2.15]} layers={Math.max(1, Math.round(1 + activity * 3))} kind="bovino" rot={0.1} />
      <PalletOfSacks at={[1.4, 0.08, 2.2]} layers={Math.max(1, Math.round(activity * 2))} kind="sal" rot={-0.12} />
      <Window at={[-1.75, 1.2, 1.31]} w={0.55} h={0.6} />
      <Window at={[1.75, 1.2, 1.31]} w={0.55} h={0.6} />
    </group>
  );
};

/* ------------------------------------------------------------------ camión */

const Wheel = ({ at, dual }: { at: [number, number, number]; dual?: boolean }) => {
  const tire = useMemo(() => tireGeometry(0.27, 0.17), []);
  const rim = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.16, 0.16, 0.18, 20);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
  const offs = dual ? [-0.1, 0.1] : [0];
  return (
    <group position={at}>
      {offs.map((o) => (
        <group key={o} position-x={o}>
          <mesh geometry={tire} castShadow>
            <meshStandardMaterial color="#1b1c1d" roughness={0.92} />
          </mesh>
          <mesh geometry={rim}>
            <meshStandardMaterial color="#c9ccce" metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Camión de estacas cargado de bultos (proveedor llegando). */
export const TruckModel = ({ load = 1 }: { load?: number }) => {
  const wood = usePbr("wood", 1, 1);
  const cab = useMemo(
    () =>
      merge([
        box(1.12, 0.78, 0.78, [0, 0.98, 1.24], 1),
        box(1.12, 0.36, 0.55, [0, 0.77, 1.86], 1), // capó
        box(1.16, 0.12, 0.08, [0, 0.62, 2.16], 1), // bómper
      ]),
    [],
  );
  const bedFloor = useMemo(() => box(1.26, 0.06, 2.3, [0, 0.66, -0.35], 0.9), []);
  const stakes = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const x of [-0.6, 0.6]) {
      for (let i = 0; i < 6; i++) parts.push(box(0.05, 0.75, 0.05, [x, 1.03, -1.45 + i * 0.44], 0.9));
      for (const y of [0.85, 1.05, 1.25, 1.4]) parts.push(box(0.03, 0.09, 2.3, [x, y, -0.35], 0.9));
    }
    for (const y of [0.85, 1.05, 1.25, 1.4]) parts.push(box(1.2, 0.09, 0.03, [0, y, -1.5], 0.9));
    return merge(parts);
  }, []);
  const chassis = useMemo(() => merge([box(0.9, 0.16, 3.4, [0, 0.42, 0.25], 1), box(1.1, 0.1, 0.1, [0, 0.52, -1.42], 1)]), []);
  const sacks = useMemo(() => {
    const out: { p: [number, number, number]; r: number }[] = [];
    const layers = Math.max(1, Math.round(1 + load * 3));
    for (let l = 0; l < layers; l++)
      for (let i = 0; i < 4; i++)
        for (const x of [-0.27, 0.27]) out.push({ p: [x, 0.7 + l * 0.165, -1.15 + i * 0.52], r: ((i + l) % 2) * 0.06 });
    return out;
  }, [load]);
  return (
    <group>
      <mesh geometry={chassis} castShadow>
        <meshStandardMaterial color="#1e1f20" roughness={0.7} metalness={0.4} />
      </mesh>
      <mesh geometry={cab} castShadow receiveShadow>
        <meshStandardMaterial color="#d7dcd8" roughness={0.35} metalness={0.35} />
      </mesh>
      {/* franja de color de la empresa transportadora */}
      <mesh position={[0, 0.88, 1.24]}>
        <boxGeometry args={[1.135, 0.08, 0.79]} />
        <meshStandardMaterial color="#b23a2a" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* parabrisas y ventanas */}
      <mesh position={[0, 1.15, 1.632]} rotation-x={-0.12}>
        <planeGeometry args={[1.0, 0.36]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.565, 1.12, 1.25]} rotation-y={(s * Math.PI) / 2}>
          <planeGeometry args={[0.5, 0.32]} />
          <meshStandardMaterial {...GLASS} />
        </mesh>
      ))}
      {/* parrilla y farolas */}
      <mesh position={[0, 0.78, 2.137]}>
        <planeGeometry args={[0.7, 0.2]} />
        <meshStandardMaterial color="#2a2c2e" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.8, 2.14]}>
          <circleGeometry args={[0.07, 20]} />
          <meshStandardMaterial color="#fff6d8" emissive="#fff1c4" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`m${s}`} position={[s * 0.66, 1.12, 1.6]}>
          <boxGeometry args={[0.04, 0.16, 0.08]} />
          <meshStandardMaterial color="#1e1f20" />
        </mesh>
      ))}
      {/* platón de estacas */}
      <mesh geometry={bedFloor} castShadow receiveShadow>
        <meshStandardMaterial {...wood} roughness={0.85} />
      </mesh>
      <mesh geometry={stakes} castShadow>
        <meshStandardMaterial {...wood} color="#c9b08a" roughness={0.85} />
      </mesh>
      <SackStack positions={sacks} kind="bovino" />
      <Wheel at={[-0.55, 0.27, 1.6]} />
      <Wheel at={[0.55, 0.27, 1.6]} />
      <Wheel at={[-0.52, 0.27, -0.95]} dual />
      <Wheel at={[0.52, 0.27, -0.95]} dual />
    </group>
  );
};

/* ------------------------------------------------------------------ naturaleza */

/**
 * Árbol tropical: tronco y ramas escaneados (Poly Haven «island_tree_02», simplificados) y copa con racimos de
 * hojas reales recortadas del mismo escaneo, colocados donde el modelo original tiene sus hojas.
 */
const LEAF_CARDS = (() => {
  const out: { p: [number, number, number]; r: [number, number, number]; s: number; v: number }[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [x, y, z, w] of TREE_LEAVES as [number, number, number, number][]) {
    const k = w > 0.6 ? 3 : 2;
    for (let i = 0; i < k; i++)
      out.push({ p: [x + (rnd() - 0.5) * 0.3, y + (rnd() - 0.5) * 0.25, z + (rnd() - 0.5) * 0.3], r: [rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI], s: 0.75 + w * 0.6 + rnd() * 0.25, v: 0.78 + rnd() * 0.3 });
  }
  return out;
})();

const LeafCrown = () => {
  const tex = useColorTex("ph:leaf_cluster.webp");
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    // dos racimos distintos en la misma imagen: la mitad de las tarjetas usa cada uno
    return g;
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    LEAF_CARDS.forEach((l, i) => {
      o.position.set(...l.p);
      o.rotation.set(...l.r);
      o.scale.setScalar(l.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.setRGB(l.v, l.v * 1.04, l.v * 0.9));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  const map = useMemo(() => {
    const t = tex.clone();
    t.repeat.set(0.5, 1);
    t.needsUpdate = true;
    return t;
  }, [tex]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, LEAF_CARDS.length]} castShadow receiveShadow>
      <meshStandardMaterial map={map} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.75} color="#e7f2d2" />
    </instancedMesh>
  );
};

export const Tree = ({ at, scale = 1, seed = 1 }: { at: [number, number, number]; scale?: number; seed?: number }) => (
  <group position={at} rotation-y={seed * 1.7} scale={0.7 * scale}>
    <Model name="island_tree_02_trunk" scale={P} />
    <LeafCrown />
  </group>
);

/** Cerca de alambre de púas con postes de madera. */
export const Fence = ({ points }: { points: [number, number][] }) => {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i]!;
      const [x2, z2] = points[i + 1]!;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.round(len / 0.55));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        parts.push(cyl(0.025, 0.03, 0.5, 6, [x1 + (x2 - x1) * t, 0.25, z1 + (z2 - z1) * t]));
      }
      const ang = Math.atan2(x2 - x1, z2 - z1);
      for (const y of [0.18, 0.3, 0.42]) {
        const w = cyl(0.004, 0.004, len, 3, [0, 0, 0], [Math.PI / 2, 0, 0]);
        w.rotateY(ang);
        w.translate((x1 + x2) / 2, y, (z1 + z2) / 2);
        parts.push(w);
      }
    }
    const [lx, lz] = points[points.length - 1]!;
    parts.push(cyl(0.025, 0.03, 0.5, 6, [lx, 0.25, lz]));
    return merge(parts);
  }, [points]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color="#6a5844" roughness={0.95} />
    </mesh>
  );
};

/* ------------------------------------------------------------------ fincas (clientes) */

/** Casa de finca: muros pañetados, techo de teja a dos aguas, corredor y puerta de madera. */
export const FarmHouse = ({ at, rot = 0, overdue, reducedMotion }: { at: [number, number, number]; rot?: number; overdue: boolean; reducedMotion: boolean }) => (
  <group position={at} rotation-y={rot}>
    <group scale={0.62}>
      <Building w={2.0} d={1.5} h={1.25} ridge={0.55} wall="plaster_white" roof="tiles" overhang={0.32} />
      <mesh position={[0, 0.55, 0.756]}>
        <planeGeometry args={[0.42, 0.85]} />
        <meshStandardMaterial color="#5a3b22" roughness={0.8} />
      </mesh>
      <Window at={[-0.62, 0.72, 0.76]} w={0.4} h={0.38} />
      <Window at={[0.62, 0.72, 0.76]} w={0.4} h={0.38} />
      {/* zócalo de color (costumbre regional) */}
      <mesh position={[0, 0.3, 0.752]}>
        <planeGeometry args={[2.0, 0.28]} />
        <meshStandardMaterial color="#2c6a4e" roughness={0.9} />
      </mesh>
    </group>
    <Fence
      points={[
        [-1.0, 1.25],
        [-0.25, 1.25],
      ]}
    />
    <Fence
      points={[
        [0.25, 1.25],
        [1.0, 1.25],
        [1.0, -0.8],
      ]}
    />
    {/* bandera roja en el portón: el cliente está en mora */}
    {overdue ? <Flag at={[0.25, 0, 1.25]} color="#c62f22" reducedMotion={reducedMotion} /> : null}
  </group>
);

/** Banderín de tela que ondea (se queda quieto si se pide reducir el movimiento). */
export const Flag = ({ at, color, reducedMotion, height = 0.95 }: { at: [number, number, number]; color: string; reducedMotion: boolean; height?: number }) => {
  const cloth = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.34, 0.22, 10, 4);
    g.translate(0.17, 0, 0);
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position!.array), [geo]);
  useFrame((state) => {
    if (reducedMotion || !cloth.current) return;
    const p = cloth.current.geometry.attributes.position as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3]!;
      p.setZ(i, Math.sin(x * 14 - t * 5) * 0.03 * (x / 0.34));
    }
    p.needsUpdate = true;
    cloth.current.geometry.computeVertexNormals();
  });
  return (
    <group position={at}>
      <mesh position-y={height / 2} castShadow>
        <cylinderGeometry args={[0.012, 0.014, height, 6]} />
        <meshStandardMaterial color="#d9d6cf" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={cloth} geometry={geo} position-y={height - 0.12} castShadow>
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ caja */

/** Caja: mesón con caja registradora, fajos de billetes y monedas (la altura sigue el recaudo). */
export const CashDeskModel = ({ level }: { level: number }) => {
  const bills = useColorTex("bills_c.webp");
  const stacks = [0.7, 1, 0.85, 0.55].map((f) => Math.max(0.04, (0.05 + level * 0.45) * f));
  const desk = useMemo(() => merge([box(1.9, 0.78, 0.8, [0, 0.39, 0], 1), box(2.0, 0.05, 0.9, [0, 0.805, 0], 1)]), []);
  return (
    <group>
      <mesh position-y={0.03} receiveShadow geometry={useMemo(() => box(2.8, 0.06, 2.0, [0, 0, 0], 1.5), [])}>
        <Pbr name="concrete" color="#c4bfb3" />
      </mesh>
      <mesh geometry={desk} position-y={0.06} castShadow receiveShadow>
        <Pbr name="wood" repeat={[1.2, 1.2]} color="#a7855f" roughness={0.6} />
      </mesh>
      {/* registradora / terminal POS */}
      <group position={[-0.45, 0.9, -0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.14, 0.42]} />
          <meshStandardMaterial color="#2a2d2f" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.22, -0.1]} rotation-x={-0.25} castShadow>
          <boxGeometry args={[0.42, 0.28, 0.03]} />
          <meshStandardMaterial color="#1b1d1e" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.22, -0.083]} rotation-x={-0.25}>
          <planeGeometry args={[0.38, 0.24]} />
          <meshStandardMaterial color="#9fd4b4" emissive="#6fbf93" emissiveIntensity={0.5} roughness={0.2} />
        </mesh>
      </group>
      {stacks.map((h, i) => (
        <mesh key={i} position={[0.15 + (i % 2) * 0.32, 0.86 + h / 2, -0.15 + Math.floor(i / 2) * 0.3]} rotation-y={(i - 1.5) * 0.12} castShadow>
          <boxGeometry args={[0.26, h, 0.13]} />
          <meshStandardMaterial attach="material-0" color="#cfd9c8" roughness={0.9} />
          <meshStandardMaterial attach="material-1" color="#cfd9c8" roughness={0.9} />
          <meshStandardMaterial attach="material-2" map={bills} roughness={0.85} />
          <meshStandardMaterial attach="material-3" color="#cfd9c8" roughness={0.9} />
          <meshStandardMaterial attach="material-4" color="#cfd9c8" roughness={0.9} />
          <meshStandardMaterial attach="material-5" color="#cfd9c8" roughness={0.9} />
        </mesh>
      ))}
      {Array.from({ length: Math.max(1, Math.round(2 + level * 8)) }, (_, i) => (
        <mesh key={`c${i}`} position={[0.78, 0.87 + i * 0.022, 0.25]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 24]} />
          <meshStandardMaterial color="#c9a23a" metalness={0.9} roughness={0.28} />
        </mesh>
      ))}
      {/* taburete */}
      <group position={[0, 0.06, -0.85]}>
        <mesh position-y={0.62} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 20]} />
          <meshStandardMaterial color="#3a2a1d" roughness={0.7} />
        </mesh>
        <mesh position-y={0.3}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ obra de la ampliación */

/** Obra: placa de cimentación, columnas, placas por piso (según el VPN), andamio, arena y bloques. */
export const ConstructionModel = ({ floors, verdict, tone }: { floors: number; verdict: string; tone: "good" | "warn" | "bad" | "neutral" }) => {
  const levelH = 0.95;
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [box(3.0, 0.14, 2.2, [0, 0.07, 0], 1.5)];
    for (let f = 0; f < floors; f++) {
      const y = 0.14 + f * levelH;
      for (const x of [-1.35, 0, 1.35]) for (const z of [-0.95, 0.95]) parts.push(box(0.16, levelH, 0.16, [x, y + levelH / 2, z], 1.5));
      if (f < floors - 1) parts.push(box(3.0, 0.12, 2.2, [0, y + levelH, 0], 1.5));
    }
    return merge(parts);
  }, [floors]);
  const rebar = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const top = 0.14 + floors * levelH;
    for (const x of [-1.35, 0, 1.35]) for (const z of [-0.95, 0.95]) for (const [dx, dz] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]] as const) parts.push(cyl(0.008, 0.008, 0.4, 4, [x + dx, top + 0.2, z + dz]));
    return merge(parts);
  }, [floors]);
  const scaffold = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const H = 0.14 + floors * levelH;
    for (const x of [-1.5, -0.5, 0.5, 1.5]) for (const z of [1.3, 1.75]) parts.push(cyl(0.018, 0.018, H, 6, [x, H / 2, z]));
    for (let y = 0.5; y < H; y += 0.5)
      for (const z of [1.3, 1.75]) {
        const g = cyl(0.014, 0.014, 3.0, 6, [0, 0, 0], [0, 0, Math.PI / 2]);
        g.translate(0, y, z);
        parts.push(g);
      }
    return merge(parts);
  }, [floors]);
  const blocks = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let l = 0; l < 4; l++) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) parts.push(box(0.2, 0.1, 0.1, [i * 0.21, 0.05 + l * 0.105, j * 0.105], 0.5));
    return merge(parts);
  }, []);
  const color = tone === "good" ? "#2c7a52" : tone === "warn" ? "#c98a1d" : tone === "bad" ? "#b3392b" : "#3a7ca5";
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <Pbr name="concrete" repeat={[1, 1]} color="#d2cfc6" />
      </mesh>
      <mesh geometry={rebar}>
        <meshStandardMaterial color="#5a3d2c" metalness={0.6} roughness={0.7} />
      </mesh>
      <mesh geometry={scaffold} castShadow>
        <meshStandardMaterial color="#c9cdcf" metalness={0.8} roughness={0.35} />
      </mesh>
      {/* tablones del andamio */}
      {Array.from({ length: Math.max(1, Math.floor((floors * levelH) / 0.5)) }, (_, i) => (
        <mesh key={i} position={[0, 0.52 + i * 0.5, 1.52]} castShadow>
          <boxGeometry args={[3.0, 0.03, 0.4]} />
          <meshStandardMaterial color="#b08a5a" roughness={0.9} />
        </mesh>
      ))}
      <mesh geometry={blocks} position={[-2.3, 0, -0.4]} castShadow>
        <meshStandardMaterial color="#9a9890" roughness={0.95} />
      </mesh>
      <mesh position={[2.1, 0.18, -0.7]} castShadow>
        <coneGeometry args={[0.55, 0.36, 24]} />
        <Pbr name="dirt" repeat={[0.6, 0.6]} color="#d8c398" />
      </mesh>
      <ModelInstances name="cement_bag" items={useMemo(() => [0, 1, 2, 3, 4].flatMap((l) => [-0.25, 0.25].map((x) => ({ p: [1.9 + x, 0.07 + l * 0.17, 0.75] as [number, number, number], r: (l % 2) * Math.PI + x * 0.1, s: P }))), [])} />
      <Model name="wooden_ladder" at={[-1.2, 0.0, -1.35]} rot={Math.PI} scale={P * 0.9} />
      <Model name="wooden_crate_02" at={[2.3, 0.0, -1.3]} rot={0.4} scale={P * 0.8} />
      <SignBoard at={[-2.0, 1.15, 1.25]} w={1.25} h={0.55} text={verdict} bg={color} rotY={0.25} />
      <mesh position={[-2.0, 0.45, 1.24]} rotation-y={0.25}>
        <boxGeometry args={[0.06, 0.9, 0.06]} />
        <meshStandardMaterial color="#6a5844" roughness={0.9} />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ oficina del SIG */

/** Oficina del SIG: pabellón de vidrio con escritorio, computador con el tablero y servidor. */
export const OfficeModel = ({ glow }: { glow: number }) => {
  const screen = useColorTex("screen_c.webp");
  const frame = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const x of [-1.2, 1.2]) for (const z of [-0.9, 0.9]) parts.push(box(0.07, 1.7, 0.07, [x, 0.95, z], 1));
    parts.push(box(2.6, 0.1, 2.0, [0, 1.85, 0], 1));
    return merge(parts);
  }, []);
  return (
    <group>
      <mesh position-y={0.05} receiveShadow geometry={useMemo(() => box(3.0, 0.1, 2.4, [0, 0, 0], 1.6), [])}>
        <Pbr name="concrete" color="#e2ded4" />
      </mesh>
      <mesh geometry={frame} castShadow>
        <meshStandardMaterial color="#2e3335" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* vidrios */}
      {(
        [
          [0, 0.95, -0.9, 0, 2.4],
          [-1.2, 0.95, 0, Math.PI / 2, 1.8],
          [1.2, 0.95, 0, Math.PI / 2, 1.8],
        ] as const
      ).map(([x, y, z, r, w], i) => (
        <mesh key={i} position={[x, y, z]} rotation-y={r}>
          <planeGeometry args={[w, 1.7]} />
          <meshStandardMaterial color="#a9c4c9" transparent opacity={0.18} roughness={0.05} metalness={0.2} envMapIntensity={2} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {/* escritorio metálico de oficina y lámpara de brazo (escaneados) */}
      <Model name="metal_office_desk" at={[0, 0.1, -0.4]} scale={P * 0.72} />
      <Model name="desk_lamp_arm_01" at={[-0.55, 0.67, -0.55]} rot={0.6} scale={P * 0.7} />
      {/* monitor con el tablero del SIG */}
      <group position={[0.05, 0.92, -0.58]}>
        <mesh castShadow>
          <boxGeometry args={[0.78, 0.48, 0.03]} />
          <meshStandardMaterial color="#141516" roughness={0.4} />
        </mesh>
        <mesh position-z={0.017}>
          <planeGeometry args={[0.74, 0.44]} />
          <meshStandardMaterial map={screen} emissiveMap={screen} emissive="#ffffff" emissiveIntensity={0.55 + glow * 0.5} roughness={0.15} />
        </mesh>
        <mesh position={[0, -0.25, -0.02]}>
          <boxGeometry args={[0.05, 0.14, 0.05]} />
          <meshStandardMaterial color="#2a2c2e" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      {/* servidor con luces de actividad */}
      <group position={[0.95, 0.1, -0.55]}>
        <mesh position-y={0.42} castShadow>
          <boxGeometry args={[0.36, 0.84, 0.42]} />
          <meshStandardMaterial color="#1d1f21" roughness={0.45} metalness={0.4} />
        </mesh>
        {[0.2, 0.35, 0.5, 0.65].map((y, i) => (
          <mesh key={y} position={[-0.1 + (i % 2) * 0.04, y, 0.212]}>
            <circleGeometry args={[0.012, 10]} />
            <meshBasicMaterial color={i % 2 ? "#6fdc9f" : "#ffc35a"} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <Model name="potted_plant_02" at={[-0.95, 0.1, 0.55]} scale={P * 0.6} />
    </group>
  );
};

/* ------------------------------------------------------------------ señalización */

/** Señal de advertencia en poste (punto crítico): triangular amarilla o roja. */
export const WarningSign = ({ bad, at }: { bad: boolean; at: [number, number, number] }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d")!;
    x.fillStyle = bad ? "#c62f22" : "#f2b51c";
    x.beginPath();
    x.moveTo(128, 14);
    x.lineTo(244, 228);
    x.lineTo(12, 228);
    x.closePath();
    x.fill();
    x.lineWidth = 14;
    x.strokeStyle = bad ? "#ffffff" : "#1a1a1a";
    x.stroke();
    x.fillStyle = bad ? "#ffffff" : "#1a1a1a";
    x.font = "900 130px sans-serif";
    x.textAlign = "center";
    x.fillText("!", 128, 205);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [bad]);
  return (
    <group position={at}>
      <mesh position-y={0.55} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
        <meshStandardMaterial color="#9ea3a5" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.15, 0.025]} castShadow>
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial map={tex} transparent alphaTest={0.5} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
