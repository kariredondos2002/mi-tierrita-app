import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Preferencias y progreso de la experiencia inmersiva (por navegador).
 * - mode: vista 3D o vista en lista (alternativa accesible y liviana).
 * - explored: nodos del mapa vivo que cada usuario ya abrió (recorrido guiado).
 * - visited: módulos que cada usuario ya revisó (misiones de los puntos críticos).
 * - unlocked: logros desbloqueados. Nada de esto se envía a la API: es progreso personal.
 */
export type ViewMode = "3d" | "2d";

type ByUser = Record<string, string[]>;

type ExperienceState = {
  mode: ViewMode;
  explored: ByUser;
  visited: ByUser;
  unlocked: ByUser;
  setMode: (mode: ViewMode) => void;
  markExplored: (user: string, key: string) => boolean;
  markVisited: (user: string, path: string) => void;
  unlock: (user: string, id: string) => boolean;
  reset: (user: string) => void;
};

const add = (map: ByUser, user: string, key: string): ByUser => {
  const list = map[user] ?? [];
  return list.includes(key) ? map : { ...map, [user]: [...list, key] };
};

export const useExperienceStore = create<ExperienceState>()(
  persist(
    (set, get) => ({
      mode: "3d",
      explored: {},
      visited: {},
      unlocked: {},
      setMode: (mode) => set({ mode }),
      markExplored: (user, key) => {
        const isNew = !(get().explored[user] ?? []).includes(key);
        if (isNew) set((s) => ({ explored: add(s.explored, user, key) }));
        return isNew;
      },
      markVisited: (user, path) => set((s) => ({ visited: add(s.visited, user, path) })),
      unlock: (user, id) => {
        const isNew = !(get().unlocked[user] ?? []).includes(id);
        if (isNew) set((s) => ({ unlocked: add(s.unlocked, user, id) }));
        return isNew;
      },
      reset: (user) =>
        set((s) => ({ explored: { ...s.explored, [user]: [] }, visited: { ...s.visited, [user]: [] }, unlocked: { ...s.unlocked, [user]: [] } })),
    }),
    { name: "mi-tierrita-experiencia" },
  ),
);
