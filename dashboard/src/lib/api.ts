import type { Reading } from "./types";

// Next reemplaza esta expresión por su valor literal al compilar (por el prefijo NEXT_PUBLIC_).
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {}

function ensureConfigured() {
  if (!API_URL) {
    throw new ApiError("Falta NEXT_PUBLIC_API_URL. Defínela en .env.local y vuelve a compilar.");
  }
}

function isReading(x: unknown): x is Reading {
  const r = x as Reading;
  return (
    typeof r === "object" &&
    r !== null &&
    typeof r.ts === "number" &&
    typeof r.temperature === "number" &&
    typeof r.humidity === "number"
  );
}

/** GET /readings: lecturas de las últimas `hours` horas, ordenadas por ts ascendente. */
export async function fetchReadings(
  deviceId: string,
  hours: number,
  signal?: AbortSignal,
): Promise<Reading[]> {
  ensureConfigured();
  const url = `${API_URL}/readings?device_id=${encodeURIComponent(deviceId)}&hours=${hours}`;

  let res: Response;
  try {
    res = await fetch(url, { signal, cache: "no-store" });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError("Sin conexión con la API. Revisa tu red.");
  }
  if (!res.ok) throw new ApiError(`La API respondió ${res.status} al pedir lecturas.`);

  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new ApiError("La API devolvió un formato inesperado.");

  return data.filter(isReading).map((r) => ({
    ...r,
    received_at: typeof r.received_at === "number" ? r.received_at : r.ts,
    damper_angle: typeof r.damper_angle === "number" ? r.damper_angle : 0,
  }));
}

/** POST /command: mueve la compuerta. Lanza ApiError con el mensaje del backend si falla. */
export async function sendDamperCommand(deviceId: string, angle: number): Promise<void> {
  ensureConfigured();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, damper_angle: angle }),
    });
  } catch {
    throw new ApiError("Sin conexión con la API. El comando no se envió.");
  }

  const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!res.ok || !body?.ok) {
    throw new ApiError(body?.error ?? `La API respondió ${res.status}.`);
  }
}
