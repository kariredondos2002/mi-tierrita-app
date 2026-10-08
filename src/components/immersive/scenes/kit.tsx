import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStage } from "../stageContext";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, ContactShadows, Environment, Html, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { STAGE } from "../palette";
import { SCENE_EVENT, type SceneCommand } from "../sceneCommands";
import type { Tier } from "../useImmersive";
import styles from "./SceneLabel.module.css";

/** Lienzo común: resolución según el equipo, sombras solo en equipos capaces, niebla para dar profundidad. */
export const StageCanvas = ({
  children,
  tier,
  reducedMotion,
  camera,
  fogFar = 46,
  label,
}: {
  children: ReactNode;
  tier: Tier;
  reducedMotion: boolean;
  camera: { position: [number, number, number]; fov?: number };
  fogFar?: number;
  label: string;
}) => {
  const { visible } = useStage();
  // resolución adaptable: si los cuadros por segundo caen, se baja la resolución (y vuelve a subir si mejora)
  const [dpr, setDpr] = useState(tier === "high" ? 1.75 : 1.25);
  return (
    <Canvas
      shadows={tier === "high"}
      dpr={dpr}
      frameloop={!visible ? "never" : reducedMotion ? "demand" : "always"}
      camera={{ position: camera.position, fov: camera.fov ?? 40, near: 0.1, far: 120 }}
      gl={{ antialias: tier === "high", powerPreference: tier === "high" ? "high-performance" : "low-power", alpha: true }}
      aria-label={label}
      role="img"
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(tier === "high" ? 1.75 : 1.25)} />
      <fog attach="fog" args={[STAGE.bgBottom, 18, fogFar]} />
      <Lights tier={tier} />
      {children}
    </Canvas>
  );
};

/** Luz de luna fría + relleno cálido de cosecha; reflejos con «lightformers» locales (sin descargar mapas HDR). */
const Lights = ({ tier }: { tier: Tier }) => (
  <>
    <ambientLight intensity={0.55} color="#cfe8da" />
    <hemisphereLight args={["#9fd4b4", "#08150f", 0.55]} />
    <directionalLight
      position={[8, 14, 6]}
      intensity={1.6}
      color="#f4faf6"
      castShadow={tier === "high"}
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-14}
      shadow-camera-right={14}
      shadow-camera-top={14}
      shadow-camera-bottom={-14}
    />
    <pointLight position={[-9, 5, -6]} intensity={30} distance={26} color={STAGE.harvest} />
    <pointLight position={[9, 4, 8]} intensity={22} distance={24} color={STAGE.sky} />
    {tier === "high" ? (
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, -8]} scale={[16, 5, 1]} color="#9fd4b4" />
        <Lightformer form="rect" intensity={1.6} position={[-8, 3, 4]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} color="#e3a33b" />
        <Lightformer form="ring" intensity={1.2} position={[6, 5, 6]} scale={3} color="#6aaed6" />
      </Environment>
    ) : null}
  </>
);

/** Plataforma circular con anillos concéntricos y sombras de contacto (suelo del «campo de noche»). */
export const Platform = ({ radius = 11, tier }: { radius?: number; tier: Tier }) => (
  <group>
    <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
      <circleGeometry args={[radius, 96]} />
      <meshStandardMaterial color={STAGE.ground} roughness={0.92} metalness={0.05} />
    </mesh>
    {[0.35, 0.62, 0.9].map((f) => (
      <mesh key={f} rotation-x={-Math.PI / 2} position-y={0.001}>
        <ringGeometry args={[radius * f - 0.02, radius * f, 128]} />
        <meshBasicMaterial color={STAGE.groundLine} transparent opacity={0.7} />
      </mesh>
    ))}
    <mesh rotation-x={-Math.PI / 2} position-y={-0.03}>
      <ringGeometry args={[radius, radius + 0.35, 128]} />
      <meshBasicMaterial color={STAGE.sprout} transparent opacity={0.18} />
    </mesh>
    {tier === "high" ? <ContactShadows position={[0, 0.005, 0]} opacity={0.5} scale={radius * 2.4} blur={2.4} far={6} resolution={512} color="#000000" /> : null}
  </group>
);

/** Interpola un valor hacia su objetivo cada cuadro (movimiento suave e independiente de los FPS). */
export const damp = (current: number, target: number, lambda: number, dt: number) => THREE.MathUtils.damp(current, target, lambda, dt);

/**
 * Objeto interactivo: crece al pasar el cursor, se eleva al seleccionarlo, cambia el cursor y emite eventos.
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
}: {
  position: [number, number, number];
  selected: boolean;
  dimmed: boolean;
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
    const s = selected ? 1.08 : hovered ? 1.05 : dimmed ? 0.96 : 1;
    const y = position[1] + (selected ? 0.25 : 0);
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

/** Disco de selección bajo cada objeto: se ilumina al pasar el cursor o al seleccionar. */
export const SelectionDisc = ({ radius, active, color = STAGE.sprout }: { radius: number; active: boolean; color?: string }) => {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state, dt) => {
    if (!ref.current) return;
    const pulse = active ? 0.55 + Math.sin(state.clock.elapsedTime * 3) * 0.12 : 0.14;
    ref.current.opacity = damp(ref.current.opacity, pulse, 6, dt);
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
      <ringGeometry args={[radius * 0.82, radius, 64]} />
      <meshBasicMaterial ref={ref} color={color} transparent opacity={0.14} depthWrite={false} />
    </mesh>
  );
};

/** Baliza de punto crítico: anillo que se expande y haz vertical. */
export const Beacon = ({ color, height = 3.2, reducedMotion }: { color: string; height?: number; reducedMotion: boolean }) => {
  const ring = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (reducedMotion || !ring.current || !mat.current) return;
    const t = (state.clock.elapsedTime * 0.7) % 1;
    ring.current.scale.setScalar(0.6 + t * 1.6);
    mat.current.opacity = 0.75 * (1 - t);
  });
  return (
    <group>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.03}>
        <ringGeometry args={[0.9, 1.02, 48]} />
        <meshBasicMaterial ref={mat} color={color} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position-y={height / 2}>
        <cylinderGeometry args={[0.035, 0.08, height, 10, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position-y={height}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
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

/** Flujo entre dos puntos: curva elevada con partículas que viajan (velocidad según el volumen). */
export const Flow = ({
  from,
  to,
  color,
  intensity,
  lift = 2.2,
  dashed,
  tier,
  reducedMotion,
  highlighted,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  intensity: number;
  lift?: number;
  dashed?: boolean;
  tier: Tier;
  reducedMotion: boolean;
  highlighted: boolean | null;
}) => {
  const curve = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y += lift;
    return new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
  }, [from, to, lift]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 48, highlighted ? 0.045 : 0.025, 6, false), [curve, highlighted]);
  const count = Math.max(2, Math.round((tier === "high" ? 7 : 4) * (0.35 + intensity)));
  const mesh = useRef<THREE.InstancedMesh>(null);
  const offsets = useMemo(() => Array.from({ length: count }, (_, i) => i / count), [count]);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const speed = 0.08 + intensity * 0.22;
  useEffect(() => {
    // posición inicial (y definitiva si el usuario pidió reducir el movimiento)
    if (!mesh.current) return;
    offsets.forEach((o, i) => {
      tmp.position.copy(curve.getPoint(o));
      tmp.updateMatrix();
      mesh.current!.setMatrixAt(i, tmp.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [offsets, curve, tmp]);
  useFrame((state) => {
    if (reducedMotion || !mesh.current) return;
    const t = state.clock.elapsedTime * speed;
    offsets.forEach((o, i) => {
      const p = (o + t) % 1;
      tmp.position.copy(curve.getPoint(p));
      const s = 0.6 + Math.sin(p * Math.PI) * 0.6;
      tmp.scale.setScalar(s);
      tmp.updateMatrix();
      mesh.current!.setMatrixAt(i, tmp.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  const opacity = highlighted === null ? 0.5 : highlighted ? 0.95 : 0.12;
  return (
    <group>
      <mesh geometry={tube}>
        <meshBasicMaterial color={color} transparent opacity={dashed ? opacity * 0.6 : opacity} depthWrite={false} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} visible={highlighted !== false}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
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
