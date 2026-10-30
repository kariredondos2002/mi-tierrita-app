import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Chips, QueryState } from "@/components/ui";
import { useProject, useProjects, useSimulatorDefaults } from "@/hooks/financial";
import { EXAMPLE_NAME } from "@/screens/Finance/simShared";
import { SimulatorReportView } from "@/screens/Finance/SimulatorReportView";
import type { SimulatorCalculation } from "@/types/api";

/**
 * R-04 Informe del simulador (solo ADMIN): elige el ejemplo de la ampliación o uno de los proyectos guardados y muestra
 * el mismo documento que Finanzas ofrece en «Informe». Las cifras salen del cálculo de la API, no del navegador.
 */
export const SimulatorReportPanel = ({ projectId }: { projectId?: number | undefined }) => {
  const [id, setId] = useState<number>(projectId ?? 0);
  const projects = useProjects("mine");
  const example = useSimulatorDefaults();
  const project = useProject(id === 0 ? null : id);
  const query = (id === 0 ? example : project) as UseQueryResult<SimulatorCalculation>;
  const name = id === 0 ? EXAMPLE_NAME : (project.data?.name ?? "Proyecto");

  const options = [{ value: 0, label: "Ejemplo de la ampliación" }, ...(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.name }))];
  const selector = <Chips options={options} value={id} onChange={setId} />;

  return (
    <QueryState query={query} empty={null}>
      {(calc) => <SimulatorReportView key={id} name={name} projectId={id === 0 ? null : id} input={calc.input} result={calc.result} selector={selector} />}
    </QueryState>
  );
};
