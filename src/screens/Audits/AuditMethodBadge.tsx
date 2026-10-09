import { Badge } from "@/components/ui";

const tone = (method: string): "good" | "warn" | "bad" | "neutral" => {
  switch (method.toUpperCase()) {
    case "POST":
      return "good";
    case "PUT":
    case "PATCH":
      return "warn";
    case "DELETE":
      return "bad";
    default:
      return "neutral";
  }
};

/** Nombres legibles: EXPORT y SIGNIN (v4.2) no son métodos HTTP sino acciones auditadas a propósito. */
export const AUDIT_METHOD_LABELS: Record<string, string> = {
  POST: "Alta",
  PUT: "Cambio",
  PATCH: "Cambio",
  DELETE: "Borrado",
  EXPORT: "Reporte",
  SIGNIN: "Acceso",
};

/** Etiqueta de la acción auditada: alta en verde, cambio en ámbar, borrado en rojo; reporte y acceso en gris. */
export const AuditMethodBadge = ({ method }: { method: string }) => {
  const m = method.toUpperCase();
  return <Badge tone={tone(m)}>{m === "EXPORT" || m === "SIGNIN" ? AUDIT_METHOD_LABELS[m] : m}</Badge>;
};
