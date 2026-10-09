import type { ActivityItem, Role } from "@/types/api";

/** Qué hizo la persona, en palabras, a partir de la entrada de auditoría (Mi perfil · Mi actividad). */
export const describeActivity = (item: Pick<ActivityItem, "method" | "resource" | "detail">): string => {
  const m = item.method.toUpperCase();
  if (m === "EXPORT") return item.detail ? `Descargó ${item.detail.replace(/^Reporte/, "el reporte").replace(/^Escenario/, "el escenario")}` : "Descargó un reporte";
  if (m === "SIGNIN") return item.detail ?? "Inició sesión";
  const r = item.resource.replace(/^\/api\/v1/, "").split("?")[0] ?? "";
  const rules: [RegExp, string, string?][] = [
    [/^\/sales\/\d+\/void$/, "Anuló una venta"],
    [/^\/sales$/, "Registró una venta"],
    [/^\/customers\/\d+\/payments$/, "Registró un abono"],
    [/^\/customers$/, "Creó un cliente"],
    [/^\/customers\/\d+$/, "Actualizó un cliente"],
    [/^\/products\/\d+\/batches$/, "Registró un lote"],
    [/^\/suppliers\/\d+\/purchases$/, "Registró una compra"],
    [/^\/products$/, "Creó un producto"],
    [/^\/products\/\d+$/, m === "DELETE" ? "Desactivó un producto" : "Actualizó un producto"],
    [/^\/suppliers/, m === "POST" ? "Creó un proveedor" : "Actualizó un proveedor"],
    [/^\/categories/, m === "POST" ? "Creó una categoría" : m === "DELETE" ? "Eliminó una categoría" : "Actualizó una categoría"],
    [/^\/financial\/scenarios/, "Creó un escenario financiero"],
    [/^\/users\/me\/password$/, "Cambió su contraseña"],
    [/^\/users\/me$/, "Actualizó su perfil"],
    [/^\/users/, "Gestionó un usuario"],
    [/^\/chat/, "Envió un mensaje"],
    [/^\/notifications/, "Marcó avisos como leídos"],
    [/^\/contact/, "Atendió un contacto del sitio"],
  ];
  for (const [re, text] of rules) if (re.test(r)) return text;
  return `${m} ${r}`;
};

/** «Qué puede hacer con su rol» (tabla de roles del documento 06). */
export const ROLE_PERMISSIONS: Record<Role, { can: string[]; cannot: string[] }> = {
  ADMIN: {
    can: [
      "Ver el tablero gerencial y todos los reportes",
      "Descargar ventas, inventario, cartera y escenarios en PDF o Excel",
      "Evaluar la ampliación: VPN, TIR, sensibilidad y tornado",
      "Crear usuarios y revisar la auditoría completa",
      "Vender, cobrar, comprar y registrar lotes",
      "Atender los contactos de la página pública",
    ],
    cannot: [],
  },
  SALES: {
    can: ["Registrar ventas de contado y a crédito", "Registrar abonos y consultar la cartera de cada cliente", "Descargar el reporte de ventas en PDF o Excel", "Usar el chat del equipo y la búsqueda global"],
    cannot: ["Evaluación financiera", "Reportes de inventario y cartera", "Usuarios y auditoría"],
  },
  WAREHOUSE: {
    can: ["Registrar productos, compras y lotes con su vencimiento", "Vigilar lotes por vencer y stock bajo", "Usar el chat del equipo y la búsqueda global"],
    cannot: ["Ventas y cartera", "Reportes y evaluación financiera", "Usuarios y auditoría"],
  },
};
