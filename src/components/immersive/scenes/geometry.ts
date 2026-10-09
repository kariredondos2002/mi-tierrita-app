import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Coordenadas de textura en metros (proyección por caja según la normal dominante):
 * así la madera, el concreto o el zinc tienen la misma escala en piezas de cualquier tamaño.
 * `size` = cuántos metros cubre una repetición de la textura. `swap` gira la textura 90° (ondas del zinc).
 */
export const worldUV = (g: THREE.BufferGeometry, size = 1, swap = false) => {
  const pos = g.attributes.position as THREE.BufferAttribute;
  g.computeVertexNormals();
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)),
      ay = Math.abs(nor.getY(i)),
      az = Math.abs(nor.getZ(i));
    let u: number, v: number;
    if (ax >= ay && ax >= az) [u, v] = [z, y];
    else if (ay >= ax && ay >= az) [u, v] = [x, z];
    else [u, v] = [x, y];
    if (swap) [u, v] = [v, u];
    uvs[i * 2] = u / size;
    uvs[i * 2 + 1] = v / size;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return g;
};

/** Caja con UV en metros, opcionalmente trasladada. */
export const box = (w: number, h: number, d: number, at: [number, number, number] = [0, 0, 0], size = 1, swap = false) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(...at);
  return worldUV(g, size, swap);
};

/** Cilindro con UV en metros. */
export const cyl = (rt: number, rb: number, h: number, seg = 12, at: [number, number, number] = [0, 0, 0], rot?: [number, number, number]) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)));
  g.translate(...at);
  return g;
};

/** Une varias piezas en una sola geometría (menos llamadas de dibujo). */
export const merge = (parts: THREE.BufferGeometry[]) => {
  const clean = parts.map((p) => {
    const q = p.index ? p.toNonIndexed() : p;
    ["uv1", "uv2", "color"].forEach((a) => q.deleteAttribute(a));
    if (!q.attributes.uv) worldUV(q);
    return q;
  });
  const g = mergeGeometries(clean, false);
  if (!g) throw new Error("No se pudieron unir las piezas");
  g.computeVertexNormals();
  return g;
};

/** Prisma triangular (hastial del techo a dos aguas): base `w`, altura `h`, profundidad `d`. */
export const gable = (w: number, h: number, d: number, y: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, y, -d / 2);
  return worldUV(g, 2);
};

/** Bulto de costal: caja subdividida y «abombada» como un saco lleno. */
export const sackGeometry = (w = 0.5, h = 0.17, d = 0.78) => {
  const g = new THREE.BoxGeometry(w, h, d, 10, 4, 12);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2),
      y = p.getY(i) / (h / 2),
      z = p.getZ(i) / (d / 2);
    const edge = (1 - Math.pow(Math.abs(x), 4)) * (1 - Math.pow(Math.abs(z), 6));
    p.setY(i, (y * h) / 2 * (0.35 + 0.65 * Math.max(0, edge)));
    p.setX(i, (x * w) / 2 * (1 - 0.06 * Math.abs(y)));
    p.setZ(i, (z * d) / 2 * (1 - 0.04 * Math.abs(y)));
  }
  g.computeVertexNormals();
  g.translate(0, h / 2, 0);
  return g;
};

/** Neumático con perfil redondeado (torno). */
export const tireGeometry = (r = 0.3, w = 0.2) => {
  const pts: THREE.Vector2[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI;
    pts.push(new THREE.Vector2(r - 0.05 + Math.cos(a) * 0.05, (Math.sin(a) * w) / 2));
  }
  pts.unshift(new THREE.Vector2(r * 0.62, -w / 2));
  pts.push(new THREE.Vector2(r * 0.62, w / 2));
  const g = new THREE.LatheGeometry(pts, 28);
  g.rotateZ(Math.PI / 2);
  return g;
};

/** Estiba de madera (tablas superiores, tacos y tablas inferiores). */
export const palletGeometry = () => {
  const parts: THREE.BufferGeometry[] = [];
  const W = 1.0,
    D = 1.2,
    t = 0.022;
  for (let i = 0; i < 7; i++) parts.push(box(0.11, t, D, [-W / 2 + 0.055 + (i * (W - 0.11)) / 6, 0.144 - t / 2, 0], 0.8));
  for (const x of [-W / 2 + 0.05, 0, W / 2 - 0.05]) {
    parts.push(box(0.1, t, D, [x, 0.122 - t / 2 - t, 0], 0.8));
    for (const z of [-D / 2 + 0.05, 0, D / 2 - 0.05]) parts.push(box(0.1, 0.078, 0.1, [x, 0.022 + 0.039, z], 0.8));
  }
  for (const z of [-D / 2 + 0.05, 0, D / 2 - 0.05]) parts.push(box(W, t, 0.1, [0, t / 2, z], 0.8));
  return merge(parts);
};

/** Lámina de cubierta (zinc) inclinada: las ondas corren en el sentido de la pendiente. */
export const roofSheet = (len: number, slope: number, _thick = 0.025) => {
  // lámina ondulada real: la onda (paso 7,6 cm, altura 1,8 cm a escala de maqueta) se modela en la geometría
  const pitch = 0.076 / 1.6;
  const amp = 0.018 / 1.6;
  const waves = Math.max(4, Math.round(len / pitch));
  const g = new THREE.PlaneGeometry(len, slope, waves * 6, 1);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, Math.sin((p.getX(i) / pitch) * Math.PI * 2) * amp);
  g.computeVertexNormals();
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 1.2, p.getZ(i) / 1.2);
  return g;
};
