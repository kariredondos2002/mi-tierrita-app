import { useMemo } from "react";
import { photoUrl } from "@/components/layout/AppShell";
import { Carousel, type CarouselSlide } from "@/components/ui";
import type { Role } from "@/types/api";
import styles from "./HomeScreen.module.css";

type Entry = CarouselSlide & { roles: Role[] };

/** Accesos visuales a los módulos del negocio; cada rol solo ve los que puede abrir. */
const ENTRIES: Entry[] = [
  { id: "inventario", image: photoUrl("bodega-estibas"), tag: "Bodega", title: "Inventario al día", text: "Productos, existencias y alertas de stock bajo en un solo lugar.", to: "/inventario", cta: "Ver inventario", roles: ["ADMIN", "SALES", "WAREHOUSE"] },
  { id: "lotes", image: photoUrl("bodega-sacos"), tag: "Control FEFO", title: "Lotes y vencimientos", text: "Lo que vence primero se vende primero: nada se pierde en la estantería.", to: "/lotes", cta: "Ver lotes", roles: ["ADMIN", "WAREHOUSE"] },
  { id: "proveedores", image: photoUrl("estibas-bultos"), tag: "Abastecimiento", title: "Proveedores y compras", text: "Cada compra entra como un lote con su costo y su fecha de vencimiento.", to: "/proveedores", cta: "Ver proveedores", roles: ["ADMIN", "WAREHOUSE"] },
  { id: "ventas", image: photoUrl("manos-granos"), tag: "Mostrador", title: "Punto de venta", text: "Contado o crédito, con factura correlativa y el cupo del cliente a la vista.", to: "/ventas/nueva", cta: "Nueva venta", roles: ["ADMIN", "SALES"] },
  { id: "clientes", image: photoUrl("clientes-finca"), tag: "Clientes", title: "Cartera bajo control", text: "Saldos, cupos y abonos al instante, sin cuaderno de por medio.", to: "/clientes", cta: "Ver clientes", roles: ["ADMIN", "SALES"] },
  { id: "reportes", image: photoUrl("valle-cordoba"), tag: "Gerencia", title: "Reportes con vista previa", text: "PDF con gráficos o Excel: revíselos y elija dónde guardarlos.", to: "/reportes", cta: "Ver reportes", roles: ["ADMIN", "SALES"] },
  { id: "finanzas", image: photoUrl("finanzas-escritorio"), tag: "Decisión de crecer", title: "¿Conviene ampliar el local?", text: "VPN, TIR y sensibilidad para decidir con números.", to: "/finanzas", cta: "Evaluar", roles: ["ADMIN"] },
];

/** Carrusel del inicio: fotografías del negocio como atajos a los módulos del rol. */
export const HomeCarousel = ({ role }: { role: Role }) => {
  const slides = useMemo(() => ENTRIES.filter((e) => e.roles.includes(role)).map(({ roles: _roles, ...slide }) => slide), [role]);
  return (
    <div className={styles.carouselWrap}>
      <Carousel slides={slides} label="Accesos a los módulos del negocio" />
    </div>
  );
};
