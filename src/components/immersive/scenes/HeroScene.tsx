import { Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import type { Tier } from "../useImmersive";
import { Model, ModelInstances, preloadModels } from "./assets";
import { hdriUrl, Pbr } from "./materials";

preloadModels(["sack_bovino","sack_sal","wooden_crate_01","plastic_bottle_gallon","multi_cleaner_bottle","bleach_bottle","medical_box","watering_can_metal_01","wooden_lantern_01","potted_plant_02"]);

/*
 * Bienvenida: bodegón fotorrealista del mostrador de la agropecuaria a escala real (metros). Bultos de
 * concentrado y sal mineralizada, una caja de madera con frascos, botiquín veterinario, regadera, farol y una
 * mata sobre el mesón de tablas, con la luz cálida de media mañana. Todo son escaneos de objetos reales.
 */
const P = 1.6;

/** Paralaje: la cámara sigue levemente al puntero y respira despacio (profundidad sin distraer). */
const CameraDrift = ({ reducedMotion }: { reducedMotion: boolean }) => {
  const look = useMemo(() => new THREE.Vector3(0.0, 0.4, -0.05), []);
  useFrame((state, dt) => {
    const { camera, pointer, clock } = state;
    if (reducedMotion) {
      camera.lookAt(look);
      return;
    }
    const t = clock.elapsedTime;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, 0.2 + pointer.x * 0.35 + Math.sin(t * 0.12) * 0.12, 2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.66 + pointer.y * 0.1, 2, dt);
    camera.lookAt(look);
  });
  return null;
};

const StillLife = ({ tier }: { tier: Tier }) => {
  const sacks = useMemo(
    () => [
      { p: [-0.62, 0.02, -0.12] as [number, number, number], r: 0.08, s: P },
      { p: [-0.6, 0.19, -0.1] as [number, number, number], r: -0.06, s: P },
      { p: [-0.64, 0.36, -0.14] as [number, number, number], r: 0.14, s: P },
    ],
    [],
  );
  return (
    <>
      {/* mesón de tablas viejas */}
      <mesh position={[0, -0.04, 1.1]} receiveShadow castShadow>
        <boxGeometry args={[4.4, 0.08, 3.8]} />
        <Pbr name="wood" repeat={[2.9, 2.5]} roughness={0.95} />
      </mesh>
      <ModelInstances name="sack_bovino" items={sacks} />
      <Model name="sack_sal" at={[-1.18, 0.02, 0.18]} rot={1.2} scale={P} />
      <Model name="wooden_crate_01" at={[0.42, 0.02, -0.28]} rot={-0.12} scale={P} />
      <ModelInstances
        name="plastic_bottle_gallon"
        items={[
          { p: [0.16, 0.37, -0.3], r: 0.4, s: P },
          { p: [0.36, 0.37, -0.32], r: -0.2, s: P },
        ]}
      />
      <ModelInstances
        name="multi_cleaner_bottle"
        items={[
          { p: [0.6, 0.37, -0.26], r: 0.1, s: P },
          { p: [0.72, 0.37, -0.3], r: 0.9, s: P },
        ]}
      />
      <Model name="bleach_bottle" at={[0.08, 0.02, 0.22]} rot={0.5} scale={P} />
      <Model name="medical_box" at={[0.42, 0.02, 0.28]} rot={0.2} scale={P} />
      <Model name="watering_can_metal_01" at={[1.12, 0.02, 0.12]} rot={-0.9} scale={P} />
      <Model name="wooden_lantern_01" at={[1.02, 0.02, -0.36]} rot={0.3} scale={P} />
      {tier === "high" ? <Model name="potted_plant_02" at={[-1.45, 0.02, -0.45]} rot={0.6} scale={P * 0.9} /> : null}
    </>
  );
};

const HeroScene = ({ tier, reducedMotion }: { tier: Tier; reducedMotion: boolean }) => (
  <Canvas
    shadows={{ type: THREE.PCFShadowMap }}
    dpr={tier === "high" ? [1, 1.8] : [1, 1.25]}
    frameloop={reducedMotion ? "demand" : "always"}
    camera={{ position: [0.2, 0.66, 3.7], fov: 30, near: 0.05, far: 40 }}
    gl={{ antialias: true, alpha: true, powerPreference: "low-power", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    style={{ position: "absolute", inset: 0 }}
    aria-hidden="true"
  >
    <Suspense fallback={null}>
      <Environment files={hdriUrl("morning")} environmentIntensity={0.7} />
      <directionalLight
        position={[-2.6, 3.2, 1.8]}
        intensity={2.6}
        color="#ffe2b8"
        castShadow
        shadow-mapSize={tier === "high" ? [2048, 2048] : [1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      <StillLife tier={tier} />
    </Suspense>
    <CameraDrift reducedMotion={reducedMotion} />
  </Canvas>
);

export default HeroScene;
