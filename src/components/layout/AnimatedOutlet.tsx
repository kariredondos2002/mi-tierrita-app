import { Suspense, useState } from "react";
import { Loading } from "@/components/ui";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, m } from "motion/react";

/** Primer segmento de la ruta: cambiar de pestaña dentro de un módulo no repite la transición de pantalla. */
const sectionOf = (pathname: string) => `/${pathname.split("/")[1] ?? ""}`;

/**
 * Transición entre pantallas: la saliente se desvanece hacia arriba y la entrante sube suavemente.
 * Se congela el outlet saliente para que su contenido no cambie mientras sale.
 */
export const AnimatedOutlet = ({ className }: { className?: string }) => {
  const location = useLocation();
  const outlet = useOutlet();
  const key = sectionOf(location.pathname);
  const [frozen] = useState(() => new Map<string, React.ReactNode>());
  frozen.set(key, outlet);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.main
        key={key}
        className={className}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => {
          for (const k of frozen.keys()) if (k !== key) frozen.delete(k);
        }}
      >
        {/* cada pantalla se descarga al visitarla por primera vez (división del código por ruta) */}
        <Suspense fallback={<Loading text="Abriendo módulo…" />}>{frozen.get(key)}</Suspense>
      </m.main>
    </AnimatePresence>
  );
};
