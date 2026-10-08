import { createContext, useContext, type RefObject } from "react";

/**
 * Contexto del escenario para las escenas 3D:
 * - portal: capa DOM estable donde viven las etiquetas (sobrevive al desmontaje del lienzo al pasar a «Lista»);
 * - visible: si el escenario está en pantalla; fuera de pantalla la escena deja de dibujar (ahorra batería).
 */
export type StageCtx = { portal: RefObject<HTMLDivElement | null> | null; visible: boolean };
export const StageContext = createContext<StageCtx>({ portal: null, visible: true });
export const useStage = () => useContext(StageContext);
