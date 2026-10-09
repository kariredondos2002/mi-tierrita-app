import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSessionStore } from "@/stores/session";
import type { Role } from "@/types/api";
import { RestrictedScreen } from "@/screens/Restricted/RestrictedScreen";
import { lazy, Suspense } from "react";

const LandingScreen = lazy(() =>
  import("@/screens/Landing/LandingScreen").then((m) => ({
    default: m.LandingScreen,
  })),
);

/**
 * Guarda de sesión: sin token, la raíz muestra la página pública de inicio y cualquier
 * otra ruta redirige a Iniciar sesión (y vuelve a ella después de entrar).
 */
export const RequireSession = () => {
  const token = useSessionStore((s) => s.token);
  const location = useLocation();
  if (!token && location.pathname === "/")
    return (
      <Suspense fallback={null}>
        <LandingScreen />
      </Suspense>
    );
  if (!token)
    return (
      <Navigate
        to="/iniciar-sesion"
        replace
        state={{ from: location.pathname }}
      />
    );
  return <Outlet />;
};

/** Guarda de rol: muestra Acceso restringido sin llegar a pedir datos al backend (RNF-01). */
export const RequireRole = ({ roles }: { roles: Role[] }) => {
  const user = useSessionStore((s) => s.user);
  if (!user || !roles.includes(user.role))
    return <RestrictedScreen roles={roles} />;
  return <Outlet />;
};

/** Con sesión activa, Iniciar sesión redirige al inicio. */
export const RedirectIfSession = () => {
  const token = useSessionStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;
  return <Outlet />;
};
