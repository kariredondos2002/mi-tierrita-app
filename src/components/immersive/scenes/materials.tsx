import { useMemo } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Texturas PBR escaneadas de superficies reales (Poly Haven, CC0; en /public/assets/3d/tex): color, normal y
 * rugosidad a 1 K. Las pocas que no tienen equivalente (cartón, tejido, puerta, estantería pintada) son propias
 * (/public/3d/tex). Una misma imagen se reutiliza con distintas repeticiones clonando la textura.
 */
const BASE = `${import.meta.env.BASE_URL}3d/`;
const PH = `${import.meta.env.BASE_URL}assets/3d/`;
export const texUrl = (file: string) => `${BASE}tex/${file}`;
/** Iluminación por imagen: cielos HDR reales de 1–2 K. */
const HDRI: Record<string, string> = {
  morning: `${PH}hdri/kiara_4_mid-morning_1536.hdr`,
  studio: `${PH}hdri/studio_small_08_1k.hdr`,
};
export const hdriUrl = (name: string) => HDRI[name] ?? `${BASE}hdri/${name}.exr`;

/** Escaneos de Poly Haven usados para cada material de la maqueta. */
const SCAN: Partial<Record<string, string>> = {
  grass: "sparse_grass",
  dirt: "brown_mud_dry",
  concrete: "concrete_floor_worn_001",
  zinc: "corrugated_iron_02",
  wood: "weathered_planks",
  table: "wood_table_worn",
  tiles: "clay_roof_tiles_02",
  asphalt: "gravel_ground_01",
  gravel: "gravel_ground_01",
  plaster_cream: "yellow_plaster",
  plaster_white: "white_plaster_clean",
  plaster_green: "white_plaster_clean",
};
const files = (name: string) => {
  const id = SCAN[name];
  return id
    ? [`${PH}tex/${id}_Diffuse.webp`, `${PH}tex/${id}_nor_gl.webp`, `${PH}tex/${id}_Rough.webp`]
    : [texUrl(`${name}_c.webp`), texUrl(`${name}_n.webp`), texUrl(`${name}_r.webp`)];
};
/** Tinte que se aplica sobre el escaneo (p. ej. pañete pintado de verde). */
export const PBR_TINT: Partial<Record<string, string>> = { plaster_green: "#7fae8c" };

/** Materiales con mapa de normales y rugosidad. */
export type PbrName =
  | "grass"
  | "dirt"
  | "concrete"
  | "zinc"
  | "wood"
  | "table"
  | "tiles"
  | "asphalt"
  | "gravel"
  | "plaster_cream"
  | "plaster_white"
  | "plaster_green"
  | "door";

const ALL_PBR: PbrName[] = ["grass", "dirt", "concrete", "zinc", "wood", "table", "tiles", "asphalt", "plaster_cream", "plaster_white", "door"];

const prep = (t: THREE.Texture, srgb: boolean, rx: number, ry: number, aniso: number) => {
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(rx, ry);
  c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  c.anisotropy = aniso;
  c.needsUpdate = true;
  return c;
};

/** Mapas de un material PBR con la repetición indicada. */
export const usePbr = (name: PbrName, rx = 1, ry = rx) => {
  const urls = useMemo(() => files(name), [name]);
  const [c, n, r] = useLoader(THREE.TextureLoader, urls) as THREE.Texture[];
  const aniso = useThree((s) => Math.min(8, s.gl.capabilities.getMaxAnisotropy()));
  return useMemo(
    () => ({ map: prep(c!, true, rx, ry, aniso), normalMap: prep(n!, false, rx, ry, aniso), roughnessMap: prep(r!, false, rx, ry, aniso) }),
    [c, n, r, rx, ry, aniso],
  );
};

/** Textura de solo color (etiquetas, letrero, follaje, pantalla). */
export const useColorTex = (file: string, rx = 1, ry = 1) => {
  const t = useLoader(THREE.TextureLoader, file.startsWith("ph:") ? `${PH}tex/${file.slice(3)}` : texUrl(file));
  const aniso = useThree((s) => Math.min(8, s.gl.capabilities.getMaxAnisotropy()));
  return useMemo(() => {
    const c = prep(t, true, rx, ry, aniso);
    if (rx === 1 && ry === 1) c.wrapS = c.wrapT = THREE.ClampToEdgeWrapping;
    return c;
  }, [t, rx, ry, aniso]);
};

/** Precarga todas las texturas para que la escena aparezca completa de una vez. */
export const preloadTextures = () => {
  ALL_PBR.forEach((n) => useLoader.preload(THREE.TextureLoader, files(n)));
};

/** Material estándar con un mapa PBR. */
export const Pbr = ({
  name,
  repeat = [1, 1],
  normalScale = 1,
  color,
  roughness = 1,
  metalness = 0,
  side,
  envMapIntensity = 1,
}: {
  name: PbrName;
  repeat?: [number, number];
  normalScale?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
  side?: THREE.Side;
  envMapIntensity?: number;
}) => {
  const maps = usePbr(name, repeat[0], repeat[1]);
  const ns = useMemo(() => new THREE.Vector2(normalScale, normalScale), [normalScale]);
  return <meshStandardMaterial {...maps} normalScale={ns} color={color ?? PBR_TINT[name] ?? "#ffffff"} roughness={roughness} metalness={metalness} side={side} envMapIntensity={envMapIntensity} />;
};
