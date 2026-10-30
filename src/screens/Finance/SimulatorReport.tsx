import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import type { SimulatorInput, SimulatorResult } from "@/types/api";
import { SimulatorReportView } from "./SimulatorReportView";

type Props = { name: string; projectId: number | null; input: SimulatorInput; result: SimulatorResult; size?: "sm" | "md" };

/**
 * Botón «Informe» de Finanzas: abre el informe R-04 en una ventana con la misma vista previa, portada, folio, QR y Excel
 * que los reportes de ventas, inventario y cartera (`SimulatorReportView`). También se alcanza desde Reportes.
 */
export const SimulatorReport = ({ name, projectId, input, result, size = "md" }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size={size} onClick={() => setOpen(true)} title="Abre el informe del proyecto con vista previa, PDF y Excel">
        Informe
      </Button>
      {open ? (
        <Modal open title="Informe del simulador" description="Mismo documento que los reportes: vista previa, PDF con portada y folio, y Excel." onClose={() => setOpen(false)} wide>
          <SimulatorReportView name={name} projectId={projectId} input={input} result={result} />
        </Modal>
      ) : null}
    </>
  );
};
