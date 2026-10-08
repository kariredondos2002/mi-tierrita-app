import { lazy } from "react";
import type React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RedirectIfSession, RequireRole, RequireSession } from "./guards";
import { rolesFor } from "./navigation";
import { SigninScreen } from "@/screens/Signin/SigninScreen";
const HomeScreen = lazy(() => import("@/screens/Home/HomeScreen").then((m) => ({ default: m.HomeScreen })));
const InventoryScreen = lazy(() => import("@/screens/Inventory/InventoryScreen").then((m) => ({ default: m.InventoryScreen })));
const BatchesScreen = lazy(() => import("@/screens/Batches/BatchesScreen").then((m) => ({ default: m.BatchesScreen })));
const SalesScreen = lazy(() => import("@/screens/Sales/SalesScreen").then((m) => ({ default: m.SalesScreen })));
const CustomersScreen = lazy(() => import("@/screens/Customers/CustomersScreen").then((m) => ({ default: m.CustomersScreen })));
const SuppliersScreen = lazy(() => import("@/screens/Suppliers/SuppliersScreen").then((m) => ({ default: m.SuppliersScreen })));
const FinanceScreen = lazy(() => import("@/screens/Finance/FinanceScreen").then((m) => ({ default: m.FinanceScreen })));
const ReportsScreen = lazy(() => import("@/screens/Reports/ReportsScreen").then((m) => ({ default: m.ReportsScreen })));
const UsersScreen = lazy(() => import("@/screens/Users/UsersScreen").then((m) => ({ default: m.UsersScreen })));
const AuditsScreen = lazy(() => import("@/screens/Audits/AuditsScreen").then((m) => ({ default: m.AuditsScreen })));
import { NotFoundScreen } from "@/screens/Restricted/RestrictedScreen";

/** Cada ruta declara qué roles pueden verla (documento 07, sección 5). */
const protectedRoute = (path: string, element: React.ReactElement) => ({
  element: <RequireRole roles={rolesFor(path)} />,
  children: [{ path, element }],
});

export const router = createBrowserRouter([
  {
    element: <RedirectIfSession />,
    children: [{ path: "/iniciar-sesion", element: <SigninScreen /> }],
  },
  {
    element: <RequireSession />,
    children: [
      {
        element: <AppShell />,
        children: [
          protectedRoute("/", <HomeScreen />),
          protectedRoute("/inventario", <InventoryScreen />),
          protectedRoute("/lotes", <BatchesScreen />),
          { element: <RequireRole roles={rolesFor("/ventas")} />, children: [{ path: "/ventas", element: <SalesScreen /> }, { path: "/ventas/:tab", element: <SalesScreen /> }] },
          protectedRoute("/clientes", <CustomersScreen />),
          protectedRoute("/proveedores", <SuppliersScreen />),
          { element: <RequireRole roles={rolesFor("/finanzas")} />, children: [{ path: "/finanzas", element: <FinanceScreen /> }, { path: "/finanzas/:tab", element: <FinanceScreen /> }] },
          protectedRoute("/reportes", <ReportsScreen />),
          protectedRoute("/usuarios", <UsersScreen />),
          protectedRoute("/auditoria", <AuditsScreen />),
          { path: "*", element: <NotFoundScreen /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
