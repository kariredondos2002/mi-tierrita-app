/** Modelo del «mapa vivo del negocio»: los nodos del sistema y los flujos que los conectan (sin dependencias 3D). */
export type NodeKey = "proveedores" | "bodega" | "mostrador" | "clientes" | "caja" | "ampliacion" | "sig";
export type Tone = "good" | "warn" | "bad" | "neutral";
export type FlowKind = "mercancia" | "dinero" | "informacion";

export type SystemNode = {
  key: NodeKey;
  title: string;
  /** Enfoque del SIG al que pertenece el nodo. */
  layer: "ERP" | "BI" | "DSS" | "SIG";
  /** Qué pasa en este punto del sistema, en una frase. */
  role: string;
  metrics: { label: string; value: string }[];
  tone: Tone;
  /** Punto crítico activo (se dibuja una baliza). */
  alert?: string;
  /** Módulo que atiende este punto. */
  path: string;
  cta: string;
  /** Magnitud normalizada 0..1 que gobierna la altura o el tamaño del objeto. */
  level: number;
  /** Elementos repetidos (casas de clientes, cajas en bodega). */
  count?: number;
  /** De esos elementos, cuántos están en estado crítico. */
  critical?: number;
};

export type SystemFlow = { from: NodeKey; to: NodeKey; kind: FlowKind; label: string; intensity: number };

export const FLOW_LABEL: Record<FlowKind, string> = { mercancia: "Mercancía", dinero: "Dinero", informacion: "Información" };
