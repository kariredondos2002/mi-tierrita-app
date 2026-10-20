import axios from "axios";
import { http } from "@/lib/http";

/** Nombre sugerido por el servidor en Content-Disposition (admite filename*=UTF-8''...). */
export const filenameFrom = (header: string | undefined, fallback: string): string => {
  if (!header) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) return decodeURIComponent(star[1].trim());
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || fallback;
};

/** Guarda un Blob en el equipo con un enlace temporal. */
export const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Archivo generado por la API, todavía sin guardar: permite verlo antes y elegir dónde guardarlo. */
export type ExportedFile = { blob: Blob; name: string; mime: string };

/**
 * Pide a la API un archivo (PDF o Excel) con la sesión del usuario y lo devuelve en memoria. Con responseType blob los
 * errores también llegan como Blob: se convierten a JSON para que toApiError lea el código.
 * La generación queda auditada una sola vez, aunque después se guarde o descargue varias veces.
 */
export const fetchFile = async (path: string, params: Record<string, unknown>, fallback: string): Promise<ExportedFile> => {
  try {
    const res = await http.get<Blob>(path, { params, responseType: "blob", timeout: 60_000 });
    const name = filenameFrom(res.headers["content-disposition"] as string | undefined, fallback);
    const mime = (res.headers["content-type"] as string | undefined)?.split(";")[0]?.trim() || res.data.type || "application/octet-stream";
    return { blob: res.data, name, mime };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text()) as unknown;
      } catch {
        /* cuerpo no JSON: se deja como está */
      }
    }
    throw err;
  }
};

/** Descarga directa (sin vista previa): genera el archivo y lo guarda con el nombre del servidor. */
export const downloadFile = async (path: string, params: Record<string, unknown>, fallback: string): Promise<string> => {
  const file = await fetchFile(path, params, fallback);
  saveBlob(file.blob, file.name);
  return file.name;
};

type PickerHandle = { name: string; createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> };
type SaveFilePicker = (options: { suggestedName: string; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<PickerHandle>;

/** El cuadro «Guardar como» nativo existe en navegadores basados en Chromium y en contexto seguro (https o localhost). */
export const canSaveAs = (): boolean => typeof window !== "undefined" && window.isSecureContext && "showSaveFilePicker" in window;

const extensionOf = (name: string): string => /\.[A-Za-z0-9]+$/.exec(name)?.[0].toLowerCase() ?? "";

export type SaveAsResult = { status: "saved" | "downloaded"; name: string } | { status: "cancelled" };

/**
 * «Guardar como…»: abre el selector del sistema para elegir carpeta y nombre. Sin soporte del navegador cae a la
 * descarga normal con el nombre sugerido. Cerrar el selector no es un error: devuelve `cancelled`.
 */
export const saveBlobAs = async (file: ExportedFile): Promise<SaveAsResult> => {
  if (!canSaveAs()) {
    saveBlob(file.blob, file.name);
    return { status: "downloaded", name: file.name };
  }
  const picker = (window as unknown as { showSaveFilePicker: SaveFilePicker }).showSaveFilePicker;
  const ext = extensionOf(file.name);
  try {
    const handle = await picker.call(window, {
      suggestedName: file.name,
      types: ext ? [{ description: ext === ".pdf" ? "Documento PDF" : "Libro de Excel", accept: { [file.mime]: [ext] } }] : undefined,
    });
    const writable = await handle.createWritable();
    await writable.write(file.blob);
    await writable.close();
    return { status: "saved", name: handle.name };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { status: "cancelled" };
    throw err;
  }
};

/** Tamaño legible de un archivo (KB / MB). */
export const fileSize = (bytes: number): string => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);
