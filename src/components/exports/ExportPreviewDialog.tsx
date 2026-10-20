import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Modal } from "@/components/ui";
import { canSaveAs, fileSize, saveBlob, saveBlobAs, type ExportedFile } from "@/lib/download";
import { notify } from "@/stores/toasts";
import styles from "./ExportPreviewDialog.module.css";

type Props = { file: ExportedFile | null; title: string; onClose: () => void };

const isPdf = (file: ExportedFile) => file.mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

/**
 * Vista previa del reporte ya generado por la API, con «Guardar como…» (el selector del sistema para elegir carpeta y
 * nombre) y «Descargar». El PDF se ve en el visor del navegador; el libro de Excel no tiene vista previa en el
 * navegador, así que se muestra su ficha y el documento en pantalla de esta misma sección es el equivalente.
 */
export const ExportPreviewDialog = ({ file, title, onClose }: Props) => {
  const pdf = file ? isPdf(file) : false;
  const url = useMemo(() => (file && pdf ? URL.createObjectURL(file.blob) : null), [file, pdf]);
  const [saving, setSaving] = useState(false);
  const [savedAs, setSavedAs] = useState<string | null>(null);

  useEffect(() => {
    setSavedAs(null);
  }, [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  if (!file) return null;

  const saveAs = async () => {
    setSaving(true);
    try {
      const result = await saveBlobAs(file);
      if (result.status === "cancelled") return;
      setSavedAs(result.name);
      notify.success(result.status === "saved" ? `Guardado como ${result.name}.` : `Descargado ${result.name}.`);
    } catch {
      notify.error("No se pudo guardar el archivo. Pruebe con «Descargar».");
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    saveBlob(file.blob, file.name);
    setSavedAs(file.name);
    notify.success(`Descargado ${file.name}.`);
  };

  return (
    <Modal
      open
      xl
      title={title}
      description="Revise el documento antes de guardarlo. Su generación ya quedó registrada en la auditoría."
      onClose={onClose}
      footer={
        <>
          <span className={styles.status} role="status">
            {savedAs ? <Badge tone="good">Guardado: {savedAs}</Badge> : <span className={styles.meta}>{file.name} · {fileSize(file.blob.size)}</span>}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="secondary" onClick={download}>
            Descargar
          </Button>
          <Button onClick={() => void saveAs()} loading={saving} title={canSaveAs() ? "Elegir carpeta y nombre" : "Su navegador descargará el archivo con el nombre sugerido"}>
            Guardar como…
          </Button>
        </>
      }
    >
      {pdf && url ? (
        <div className={styles.viewer}>
          <iframe className={styles.frame} src={`${url}#toolbar=1&navpanes=0&view=FitH`} title={`Vista previa de ${file.name}`} />
          <p className={styles.fallback}>
            ¿No ve el documento? Su navegador no muestra PDF en línea: use <strong>Guardar como…</strong> o <strong>Descargar</strong>.
          </p>
        </div>
      ) : (
        <div className={styles.sheet}>
          <svg width="44" height="44" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
            <path d="M2 6.5h12M6.5 6.5v7" stroke="currentColor" strokeWidth="1.1" />
          </svg>
          <strong>{file.name}</strong>
          <span>Libro de Excel · {fileSize(file.blob.size)}</span>
          <p>
            Excel no tiene vista previa en el navegador. El contenido es el mismo del documento que ve en esta sección; guárdelo para abrirlo en Excel con sus hojas
            formateadas.
          </p>
        </div>
      )}
    </Modal>
  );
};
