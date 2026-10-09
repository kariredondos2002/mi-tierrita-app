import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { hdriUrl, usePbr, type PbrName } from "./materials";
import { useStage } from "../stageContext";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, Environment, Html, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { SCENE_EVENT, type SceneCommand } from "../sceneCommands";
import type { Tier } from "../useImmersive";
import styles from "./SceneLabel.module.css";

/** Entorno de iluminación (HDRI real de exterior o interior, licencia CC0). */
export type EnvName = "morning" | "studio" | "warehouse";

/**
 * Lienzo común con render realista: iluminación por imagen HDRI, sol con sombras suaves, mapeo de tonos
 * ACES y, en equipos capaces, oclusión ambiental (N8AO), suavizado SMAA, brillo y viñeta muy sutiles.
 * En equipos modestos se dibuja sin posprocesado y con sombras más pequeñas.
 */
export const StageCanvas = ({
  children,
  tier,
  reducedMotion,
  camera,
  label,
  env = "morning",
  envIntensity = 1,
  backgroundBlur = 0.6,
  sun = [9, 14, 7],
  sunColor = "#fff1dc",
  sunIntensity = 2.6,
  shadowBox = 16,
  exposure = 1,
  fog,
}: {
  children: ReactNode;
  tier: Tier;
  reducedMotion: boolean;
  camera: { position: [number, number, number]; fov?: number };
  label: string;
  env?: EnvName;
  envIntensity?: number;
  /** null = sin fondo (transparente). */
  backgroundBlur?: number | null;
  sun?: [number, number, number];
  sunColor?: string;
  sunIntensity?: number;
  shadowBox?: number;
  exposure?: number;
  fog?: { color: string; near: number; far: number };
  /** @deprecated se conserva por compatibilidad */
  fogFar?: number;
}) => {
  const { visible } = useStage();
  const high = tier === "high";
  // resolución adaptable: si los cuadros por segundo caen, se baja la resolución (y vuelve a subir si mejora)
  const [dpr, setDpr] = useState(high ? 1.5 : 1);
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={dpr}
      frameloop={!visible ? "never" : reducedMotion ? "demand" : "always"}
      camera={{ position: camera.position, fov: camera.fov ?? 40, near: 0.1, far: 200 }}
      gl={{
        antialias: !high,
        powerPreference: high ? "high-performance" : "low-power",
        alpha: backgroundBlur === null,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: exposure,
      }}
      aria-label={label}
      role="img"
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(high ? 1.5 : 1)} />
      {fog ? <fog attach="fog" args={[fog.color, fog.near, fog.far]} /> : null}
      <Environment
        files={hdriUrl(env)}
        background={backgroundBlur !== null}
        backgroundBlurriness={backgroundBlur ?? 0}
        environmentIntensity={envIntensity}
      />
      <directionalLight
        position={sun}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize={high ? [2048, 2048] : [1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={high ? 4 : 2}
        shadow-camera-left={-shadowBox}
        shadow-camera-right={shadowBox}
        shadow-camera-top={shadowBox}
        shadow-camera-bottom={-shadowBox}
        shadow-camera-near={1}
        shadow-camera-far={70}
      />
      {children}
      {high ? (
        <EffectComposer multisampling={0}>
          <N8AO halfRes aoRadius={1.1} distanceFalloff={0.8} intensity={2.2} quality="medium" />
          <Bloom luminanceThreshold={1} intensity={0.22} mipmapBlur />
          <Vignette offset={0.32} darkness={0.42} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
};

/**
 * Terreno: disco de textura PBR (pasto, concreto…) que se desvanece en los bordes hacia el fondo HDRI,
 * con un clic invisible que devuelve la cámara a la vista general.
 */
export const Ground = ({
  radius = 16,
  material = "grass",
  texSize = 4,
  color,
  onMiss,
}: {
  radius?: number;
  material?: PbrName;
  texSize?: number;
  color?: string;
  onMiss?: () => void;
}) => {
  const maps = usePbr(material, (radius * 2) / texSize);
  const alpha = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(128, 128, 70, 128, 128, 128);
    g.addColorStop(0, "#fff");
    g.addColorStop(1, "#000");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={onMiss ? (e) => { e.stopPropagation(); onMiss(); } : undefined}>
      <circleGeometry args={[radius, 96]} />
      <meshStandardMaterial {...maps} alphaMap={alpha} transparent depthWrite color={color ?? "#ffffff"} roughness={1} />
    </mesh>
  );
};

/** @deprecated reemplazado por `Ground`; se mantiene para escenas antiguas. */
export const Platform = ({ radius = 11 }: { radius?: number; tier?: Tier }) => <Ground radius={radius + 4} />;

/** Interpola un valor hacia su objetivo cada cuadro (movimiento suave e independiente de los FPS). */
export const damp = (current: number, target: number, lambda: number, dt: number) => THREE.MathUtils.damp(current, target, lambda, dt);

/**
 * Objeto interactivo: cambia el cursor y emite eventos. Los objetos pequeños (`lift`) se elevan al pasar el
 * cursor o seleccionarlos, como si se tomaran del estante; los edificios no se deforman (realismo).
 * Clic = seleccionar · doble clic = abrir el módulo.
 */
export const Hoverable = ({
  position,
  selected,
  dimmed,
  onSelect,
  onOpen,
  onHover,
  children,
  reducedMotion,
  lift = false,
}: {
  position: [number, number, number];
  selected: boolean;
  dimmed: boolean;
  lift?: boolean;
  onSelect: () => void;
  onOpen?: () => void;
  onHover?: (hovered: boolean) => void;
  children: (state: { hovered: boolean }) => ReactNode;
  reducedMotion: boolean;
}) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const s = lift ? (selected ? 1.05 : hovered ? 1.03 : dimmed ? 0.98 : 1) : 1;
    const y = position[1] + (lift ? (selected ? 0.35 : hovered ? 0.12 : 0) : 0);
    if (reducedMotion) {
      g.scale.setScalar(s);
      g.position.y = y;
      return;
    }
    g.scale.setScalar(damp(g.scale.x, s, 9, dt));
    g.position.y = damp(g.position.y, y, 7, dt);
  });
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover?.(true);
    invalidate();
  };
  const out = () => {
    setHovered(false);
    onHover?.(false);
    invalidate();
  };
  return (
    <group
      ref={ref}
      position={position}
      onPointerOver={over}
      onPointerOut={out}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
        invalidate();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpen?.();
      }}
    >
      {children({ hovered })}
    </group>
  );
};

/** Marca de selección en el suelo: un halo suave que solo aparece al pasar el cursor o seleccionar. */
export const SelectionDisc = ({ radius, active, color = "#ffffff" }: { radius: number; active: boolean; color?: string }) => {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(64, 64, 40, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.84, "rgba(255,255,255,0)");
    g.addColorStop(0.9, "rgba(255,255,255,0.95)");
    g.addColorStop(0.95, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  useFrame((state, dt) => {
    if (!ref.current) return;
    const target = active ? 0.55 + Math.sin(state.clock.elapsedTime * 2.6) * 0.1 : 0;
    ref.current.opacity = damp(ref.current.opacity, target, 7, dt);
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.03} renderOrder={2}>
      <planeGeometry args={[radius * 2.3, radius * 2.3]} />
      <meshBasicMaterial ref={ref} map={tex} color={color} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

/** Etiqueta flotante en DOM (texto nítido a cualquier escala). */
export const Label = ({
  position,
  title,
  value,
  hot,
  dim,
  tone,
}: {
  position: [number, number, number];
  title: string;
  value?: string;
  hot: boolean;
  dim: boolean;
  tone?: "good" | "warn" | "bad" | "neutral";
}) => (
  <StageHtml position={position}>
    <div className={[styles.label, hot ? styles.hot : "", dim ? styles.dim : "", tone === "warn" ? styles.warn : tone === "bad" ? styles.bad : ""].join(" ")}>
      <span className={styles.title}>{title}</span>
      {value ? <span className={styles.value}>{value}</span> : null}
    </div>
  </StageHtml>
);

export type FlowKind = "mercancia" | "dinero" | "informacion";

/** Franja suave a lo ancho (bordes que se funden con el pasto). */
const edgeAlpha = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 64;
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, "#000");
    g.addColorStop(0.3, "#fff");
    g.addColorStop(0.7, "#fff");
    g.addColorStop(1, "#000");
    x.fillStyle = g;
    x.fillRect(0, 0, 4, 64);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();

/** Cinta plana sobre el suelo que sigue una curva (u = metros recorridos, v = ancho). */
const ribbon = (curve: THREE.Curve<THREE.Vector3>, width: number, y: number) => {
  const n = 64;
  const pts = curve.getSpacedPoints(n);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let dist = 0;
  for (let i = 0; i <= n; i++) {
    const p = pts[i]!;
    const q = pts[Math.min(n, i + 1)]!;
    const r = pts[Math.max(0, i - 1)]!;
    const dir = new THREE.Vector3().subVectors(q, r).setY(0).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);
    if (i > 0) dist += p.distanceTo(pts[i - 1]!);
    pos.push(p.x + side.x, y, p.z + side.z, p.x - side.x, y, p.z - side.z);
    uv.push(dist, 0, dist, 1);
    if (i < n) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, length: dist };
};

const FLOW_TINT: Record<FlowKind, string> = { mercancia: "#9fd4b4", dinero: "#e3a33b", informacion: "#6aaed6" };

/**
 * Flujo entre dos puntos, dibujado como en una maqueta real: un camino de tierra (mercancía y dinero) o una
 * línea demarcada (información) sobre el terreno, por el que se mueven bultos, monedas u hojas de papel.
 * La cantidad y la velocidad siguen el volumen. Al seleccionar un punto, sus flujos se resaltan con su color.
 */
export const Flow = ({
  from,
  to,
  kind,
  intensity,
  bend = 0.18,
  tier,
  reducedMotion,
  highlighted,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  kind: FlowKind;
  intensity: number;
  bend?: number;
  tier: Tier;
  reducedMotion: boolean;
  highlighted: boolean | null;
  /** compatibilidad */ color?: string;
  lift?: number;
  dashed?: boolean;
}) => {
  const curve = useMemo(() => {
    const a = from.clone().setY(0);
    const b = to.clone().setY(0);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const d = new THREE.Vector3().subVectors(b, a);
    mid.add(new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(bend));
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }, [from, to, bend]);
  const info = kind === "informacion";
  const path = useMemo(() => ribbon(curve, info ? 0.07 : 0.85, info ? 0.016 : 0.012), [curve, info]);
  const glow = useMemo(() => ribbon(curve, info ? 0.12 : 0.62, 0.02), [curve, info]);
  const dirt = usePbr("dirt", 1 / 2.5, 1);
  const dash = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 4;
    const x = c.getContext("2d")!;
    x.fillStyle = "#fff";
    x.fillRect(0, 0, 36, 4);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(1 / 0.5, 1);
    return t;
  }, []);
  const count = Math.max(2, Math.round((tier === "high" ? 6 : 4) * (0.35 + intensity)));
  const mesh = useRef<THREE.InstancedMesh>(null);
  const offsets = useMemo(() => Array.from({ length: count }, (_, i) => i / count), [count]);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const speed = (0.04 + intensity * 0.09) * (6 / Math.max(3, path.length));
  const place = (p: number, t: number) => {
    const pt = curve.getPointAt(p);
    const tan = curve.getTangentAt(p);
    tmp.position.copy(pt);
    tmp.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
    if (kind === "mercancia") tmp.position.y = 0.06;
    else if (kind === "dinero") {
      tmp.position.y = 0.075;
      tmp.rotation.z = Math.PI / 2;
    } else {
      tmp.position.y = 0.32 + Math.sin(t * 3 + p * 12) * 0.05;
      tmp.rotation.x = -Math.PI / 2 + Math.sin(t * 2 + p * 9) * 0.25;
    }
    const s = Math.min(1, Math.sin(p * Math.PI) * 4);
    tmp.scale.setScalar(Math.max(0.001, s));
    tmp.updateMatrix();
  };
  useEffect(() => {
    if (!mesh.current) return;
    offsets.forEach((o, i) => {
      place(o, 0);
      mesh.current!.setMatrixAt(i, tmp.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsets, curve]);
  useFrame((state) => {
    if (reducedMotion || !mesh.current) return;
    const t = state.clock.elapsedTime;
    offsets.forEach((o, i) => {
      place((o + t * speed) % 1, t);
      mesh.current!.setMatrixAt(i, tmp.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  const tint = FLOW_TINT[kind];
  return (
    <group>
      <mesh geometry={path.geo} receiveShadow renderOrder={1}>
        {info ? (
          <meshStandardMaterial map={dash} color="#f4f1e8" transparent opacity={highlighted === false ? 0.35 : 0.9} alphaMap={dash} depthWrite={false} roughness={0.8} />
        ) : (
          <meshStandardMaterial {...dirt} alphaMap={edgeAlpha()} transparent depthWrite={false} roughness={1} />
        )}
      </mesh>
      {highlighted ? (
        <mesh geometry={glow.geo} renderOrder={2}>
          <meshBasicMaterial color={tint} transparent opacity={0.5} alphaMap={edgeAlpha()} depthWrite={false} toneMapped={false} />
        </mesh>
      ) : null}
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} visible={highlighted === true && kind !== "informacion"} castShadow>
        {kind === "mercancia" ? (
          <boxGeometry args={[0.2, 0.1, 0.3]} />
        ) : kind === "dinero" ? (
          <cylinderGeometry args={[0.07, 0.07, 0.025, 20]} />
        ) : (
          <planeGeometry args={[0.14, 0.18]} />
        )}
        {kind === "mercancia" ? (
          <meshStandardMaterial color="#b08a5e" roughness={0.9} />
        ) : kind === "dinero" ? (
          <meshStandardMaterial color="#c9a23a" metalness={0.9} roughness={0.28} />
        ) : (
          <meshStandardMaterial color="#fbfaf6" roughness={0.7} side={THREE.DoubleSide} />
        )}
      </instancedMesh>
    </group>
  );
};

const ACTION = { NONE: 0, ROTATE: 1, TRUCK: 2, DOLLY: 16, TOUCH_ROTATE: 64, TOUCH_DOLLY_ROTATE: 32768 } as const;

type View = { pos: [number, number, number]; target: [number, number, number] };

/**
 * Cámara común de las escenas:
 * - vuela a `view` (suave, o instantánea si se pidió reducir el movimiento);
 * - la rueda del mouse NO acerca a menos que se mantenga Ctrl/⌘ (así la página sigue desplazándose);
 * - en celular, un dedo desplaza la página y dos dedos giran y acercan;
 * - escucha los botones de acercar/alejar/volver del escenario.
 */
export const SceneCamera = ({
  view,
  home,
  reducedMotion,
  narrow,
  minDistance = 5,
  maxDistance = 30,
}: {
  view: View;
  home: View;
  reducedMotion: boolean;
  narrow: boolean;
  minDistance?: number;
  maxDistance?: number;
}) => {
  const ref = useRef<CameraControls>(null);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const key = view.pos.join(",") + view.target.join(",");
  useEffect(() => {
    void ref.current?.setLookAt(...view.pos, ...view.target, !reducedMotion);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reducedMotion]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.mouseButtons.wheel = ACTION.NONE;
    c.touches.one = narrow ? ACTION.NONE : ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY_ROTATE;
    gl.domElement.style.touchAction = narrow ? "pan-y" : "none";
    const onWheel = (e: WheelEvent) => {
      c.mouseButtons.wheel = e.ctrlKey || e.metaKey ? ACTION.DOLLY : ACTION.NONE;
    };
    const onCmd = (e: Event) => {
      const cmd = (e as CustomEvent<SceneCommand>).detail;
      if (cmd === "zoomIn") void c.dolly(2, !reducedMotion);
      else if (cmd === "zoomOut") void c.dolly(-2, !reducedMotion);
      else void c.setLookAt(...home.pos, ...home.target, !reducedMotion);
      invalidate();
    };
    gl.domElement.addEventListener("wheel", onWheel, { capture: true, passive: true });
    window.addEventListener(SCENE_EVENT, onCmd);
    return () => {
      gl.domElement.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener(SCENE_EVENT, onCmd);
    };
  }, [gl, narrow, reducedMotion, home, invalidate]);
  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={0.3}
      maxPolarAngle={1.32}
      smoothTime={reducedMotion ? 0 : 0.55}
      draggingSmoothTime={0.12}
      onChange={() => invalidate()}
    />
  );
};

/** Html anclado al escenario: se monta en la capa estable del escenario (no dentro del lienzo). */
export const StageHtml = ({ position, children }: { position: [number, number, number]; children: ReactNode }) => {
  const { portal } = useStage();
  return (
    <Html position={position} center zIndexRange={[3, 0]} style={{ pointerEvents: "none" }} portal={(portal ?? undefined) as React.RefObject<HTMLElement> | undefined}>
      {children}
    </Html>
  );
};
