import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";

type ThemeState = { mode: ThemeMode; setMode: (mode: ThemeMode) => void };

const prefersDark = (): boolean => typeof window !== "undefined" && (window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);

/** Tema efectivo: «sistema» sigue la preferencia del dispositivo, en vivo. */
export const resolveTheme = (mode: ThemeMode): "light" | "dark" => (mode === "system" ? (prefersDark() ? "dark" : "light") : mode);

const apply = (mode: ThemeMode) => {
  const root = document.documentElement;
  const theme = resolveTheme(mode);
  root.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0b0c0d" : "#121315");
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => {
        apply(mode);
        set({ mode });
      },
    }),
    { name: "mi-tierrita-theme", onRehydrateStorage: () => (state) => apply(state?.mode ?? "system") },
  ),
);

// Si la persona eligió «sistema», el tema cambia solo cuando cambia el del dispositivo.
if (typeof window !== "undefined") {
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useThemeStore.getState().mode === "system") apply("system");
  });
}
