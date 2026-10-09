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

/**
 * Descarga autenticada de un archivo generado por la API (PDF o Excel). Con responseType blob los
 * errores también llegan como Blob: se convierten a JSON para que toApiError lea el código.
 */
export const downloadFile = async (path: string, params: Record<string, unknown>, fallback: string): Promise<string> => {
  try {
    const res = await http.get<Blob>(path, { params, responseType: "blob", timeout: 60_000 });
    const name = filenameFrom(res.headers["content-disposition"] as string | undefined, fallback);
    saveBlob(res.data, name);
    return name;
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
