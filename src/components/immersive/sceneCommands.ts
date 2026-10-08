/** Órdenes de cámara desde los botones del escenario (sin dependencias 3D, para no cargar three.js antes de tiempo). */
export type SceneCommand = "zoomIn" | "zoomOut" | "reset";
export const SCENE_EVENT = "mt-scene-command";
export const sendSceneCommand = (cmd: SceneCommand) => window.dispatchEvent(new CustomEvent<SceneCommand>(SCENE_EVENT, { detail: cmd }));
