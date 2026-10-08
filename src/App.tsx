import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { router } from "@/router/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false },
  },
});

export const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* Las animaciones respetan la preferencia del sistema «reducir movimiento». */}
    <MotionConfig reducedMotion="user">
      {/* solo las funciones de animación que se usan (carga diferida, paquete más liviano) */}
      <LazyMotion features={domAnimation} strict>
        <RouterProvider router={router} />
      </LazyMotion>
    </MotionConfig>
  </QueryClientProvider>
);
