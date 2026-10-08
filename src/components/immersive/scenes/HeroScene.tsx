import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line } from "@react-three/drei";
import * as THREE from "three";
import { STAGE } from "../palette";
import type { Tier } from "../useImmersive";

/** Colinas de baja poligonización: el campo cordobés como terreno del sistema. */
const Hills = () => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(40, 26, 48, 32);
    const p = g.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const h = Math.sin(x * 0.28) * 0.9 + Math.cos(y * 0.35 + x * 0.1) * 0.7 + Math.sin((x + y) * 0.6) * 0.18;
      p.setZ(i, h - Math.max(0, y) * 0.05);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} rotation-x={-Math.PI / 2} position={[0, -2.4, -6]}>
      <meshStandardMaterial color={STAGE.leaf} flatShading roughness={0.9} />
    </mesh>
  );
};

/** Los tres enfoques del SIG orbitando el núcleo: ERP (cubo), BI (anillo), DSS (cristal). */
const Orbit = ({ reducedMotion }: { reducedMotion: boolean }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!reducedMotion && group.current) group.current.rotation.y += dt * 0.25;
  });
  const items = [
    { pos: [2.6, 0, 0] as const, color: STAGE.sprout, shape: "box" },
    { pos: [-1.3, 0.3, 2.25] as const, color: STAGE.harvest, shape: "torus" },
    { pos: [-1.3, -0.2, -2.25] as const, color: STAGE.sky, shape: "oct" },
  ];
  return (
    <group ref={group} position={[1.8, 0.7, -3]} scale={0.78}>
      <Float speed={reducedMotion ? 0 : 1.6} rotationIntensity={0.6} floatIntensity={reducedMotion ? 0 : 0.8}>
        <mesh>
          <icosahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial color={STAGE.sprout} emissive={STAGE.sprout} emissiveIntensity={0.5} flatShading metalness={0.4} roughness={0.2} />
        </mesh>
      </Float>
      {items.map((it, i) => (
        <group key={i} position={[...it.pos]}>
          <Float speed={reducedMotion ? 0 : 2 + i * 0.4} floatIntensity={reducedMotion ? 0 : 1}>
            <mesh>
              {it.shape === "box" ? <boxGeometry args={[0.7, 0.7, 0.7]} /> : it.shape === "torus" ? <torusGeometry args={[0.42, 0.13, 12, 40]} /> : <octahedronGeometry args={[0.5, 0]} />}
              <meshStandardMaterial color={it.color} emissive={it.color} emissiveIntensity={0.45} flatShading roughness={0.3} metalness={0.3} />
            </mesh>
          </Float>
        </group>
      ))}
      {/* líneas de información entre el núcleo y cada enfoque */}
      {items.map((it, i) => (
        <Line key={`l${i}`} points={[[0, 0, 0], [...it.pos]]} color={it.color} lineWidth={1.2} transparent opacity={0.55} />
      ))}
    </group>
  );
};

/** Partículas que suben como semillas de luz. */
const Seeds = ({ count, reducedMotion }: { count: number; reducedMotion: boolean }) => {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 18;
      a[i * 3 + 1] = Math.random() * 7 - 2;
      a[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
    }
    return a;
  }, [count]);
  useFrame((_, dt) => {
    if (reducedMotion || !ref.current) return;
    const p = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = p.getY(i) + dt * (0.25 + (i % 5) * 0.06);
      if (y > 5) y = -2;
      p.setY(i, y);
    }
    p.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={STAGE.harvest} size={0.07} transparent opacity={0.85} sizeAttenuation />
    </points>
  );
};

/** Paralaje: la cámara sigue levemente al puntero (profundidad sin perder la lectura del texto). */
const Parallax = ({ reducedMotion }: { reducedMotion: boolean }) => {
  useFrame((state, dt) => {
    if (reducedMotion) return;
    const { camera, pointer } = state;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 1.2, 2.5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.6 + pointer.y * 0.6, 2.5, dt);
    camera.lookAt(0.8, 0, -3);
  });
  return null;
};

/** Escena de bienvenida (decorativa): terreno, núcleo del SIG con sus tres enfoques y semillas de luz. */
const HeroScene = ({ tier, reducedMotion }: { tier: Tier; reducedMotion: boolean }) => (
  <Canvas
    dpr={tier === "high" ? [1, 1.8] : [1, 1.3]}
    frameloop={reducedMotion ? "demand" : "always"}
    camera={{ position: [0, 1.6, 7], fov: 45 }}
    gl={{ antialias: tier === "high", alpha: true, powerPreference: "low-power" }}
    style={{ position: "absolute", inset: 0 }}
    aria-hidden="true"
  >
    <fog attach="fog" args={["#0d261c", 6, 22]} />
    <ambientLight intensity={0.6} color="#cfe8da" />
    <directionalLight position={[5, 8, 4]} intensity={1.4} />
    <pointLight position={[-4, 2, 0]} intensity={18} color={STAGE.harvest} distance={14} />
    <Hills />
    <Orbit reducedMotion={reducedMotion} />
    <Seeds count={tier === "high" ? 220 : 90} reducedMotion={reducedMotion} />
    <Parallax reducedMotion={reducedMotion} />
  </Canvas>
);

export default HeroScene;
