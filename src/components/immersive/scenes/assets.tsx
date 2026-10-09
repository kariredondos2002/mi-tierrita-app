import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Modelos fotogramétricos y escaneados de Poly Haven (licencia CC0), optimizados para la web
 * (malla comprimida con meshopt y texturas WebP de 512–1024 px). Están en /public/assets/3d/models.
 * Todos vienen en metros; la maqueta usa 1 unidad ≈ 1,6 m, por eso se escalan con `M`.
 */
export const M = 1 / 1.6;

export type ModelName =
  | "bleach_bottle"
  | "cardboard_box_01"
  | "cement_bag"
  | "desk_lamp_arm_01"
  | "grass_medium_01"
  | "grass_medium_02"
  | "hand_truck"
  | "island_tree_02_trunk"
  | "medical_box"
  | "metal_jerrycan"
  | "metal_office_desk"
  | "multi_cleaner_bottle"
  | "planter_box_01"
  | "plastic_bottle_gallon"
  | "plastic_crate_01"
  | "potted_plant_02"
  | "propane_tank"
  | "rock_moss_set_01"
  | "sack_bovino"
  | "sack_sal"
  | "sack_urea"
  | "street_lamp_01"
  | "utility_box_01"
  | "watering_can_metal_01"
  | "wooden_crate_01"
  | "wooden_crate_02"
  | "wooden_display_shelves_01"
  | "wooden_ladder"
  | "wooden_lantern_01"
  | "worn_metal_rack";

export const modelUrl = (name: ModelName) => `${import.meta.env.BASE_URL}assets/3d/models/${name}.glb`;

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material; matrix: THREE.Matrix4; name: string };

/** Mallas del modelo con su transformación relativa a la raíz (para instanciar o clonar). */
export const useModelParts = (name: ModelName, only?: string) => {
  const { scene } = useGLTF(modelUrl(name));
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const parts: Part[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (only && !m.name.includes(only) && !m.parent?.name.includes(only)) return;
      const mat = Array.isArray(m.material) ? m.material[0]! : m.material;
      parts.push({ geometry: m.geometry, material: mat, matrix: m.matrixWorld.clone(), name: m.name });
    });
    return parts;
  }, [scene, only]);
};

type Placement = { p: [number, number, number]; r?: number; s?: number; rx?: number; rz?: number };

/**
 * Coloca un modelo una o varias veces. Con varias copias usa una malla instanciada por parte
 * (una sola llamada de dibujo por material aunque haya cien bultos).
 */
export const Model = ({
  name,
  at = [0, 0, 0],
  rot = 0,
  scale = 1,
  only,
  tint,
  castShadow = true,
  receiveShadow = true,
}: {
  name: ModelName;
  at?: [number, number, number];
  rot?: number;
  scale?: number;
  only?: string;
  tint?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) => {
  const parts = useModelParts(name, only);
  const mats = useMemo(
    () =>
      parts.map((p) => {
        if (!tint) return p.material;
        const m = (p.material as THREE.MeshStandardMaterial).clone();
        m.color = new THREE.Color(tint);
        return m;
      }),
    [parts, tint],
  );
  return (
    <group position={at} rotation-y={rot} scale={scale * M}>
      {parts.map((p, i) => (
        <mesh
          key={i}
          geometry={p.geometry}
          material={mats[i]}
          matrixAutoUpdate={false}
          matrix={p.matrix}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </group>
  );
};

/** Muchas copias de un modelo (bultos, botellas, matas de pasto) con mallas instanciadas. */
export const ModelInstances = ({
  name,
  items,
  only,
  castShadow = true,
  receiveShadow = true,
  tint,
}: {
  name: ModelName;
  items: Placement[];
  only?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tint?: string;
}) => {
  const parts = useModelParts(name, only);
  return (
    <>
      {parts.map((part, i) => (
        <PartInstances key={i} part={part} items={items} castShadow={castShadow} receiveShadow={receiveShadow} tint={tint} />
      ))}
    </>
  );
};

const PartInstances = ({ part, items, castShadow, receiveShadow, tint }: { part: Part; items: Placement[]; castShadow: boolean; receiveShadow: boolean; tint?: string }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => {
    if (!tint) return part.material;
    const m = (part.material as THREE.MeshStandardMaterial).clone();
    m.color = new THREE.Color(tint);
    return m;
  }, [part.material, tint]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    const out = new THREE.Matrix4();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(it.rx ?? 0, it.r ?? 0, it.rz ?? 0);
      o.scale.setScalar((it.s ?? 1) * M);
      o.updateMatrix();
      out.multiplyMatrices(o.matrix, part.matrix);
      mesh.setMatrixAt(i, out);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
  }, [items, part.matrix]);
  return <instancedMesh ref={ref} args={[part.geometry, material, Math.max(1, items.length)]} castShadow={castShadow} receiveShadow={receiveShadow} frustumCulled={false} />;
};

/** Precarga los modelos de una escena para que aparezca completa de una vez. */
export const preloadModels = (names: ModelName[]) => names.forEach((n) => useGLTF.preload(modelUrl(n)));
