import type { Reading } from "./types";

export interface Stats {
  min: number;
  max: number;
  avg: number;
}

/** Mínimo, máximo y promedio de una métrica en todas las lecturas (sin reducir). */
export function computeStats(readings: Reading[], key: "temperature" | "humidity"): Stats | null {
  if (readings.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const r of readings) {
    const v = r[key];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: sum / readings.length };
}

/**
 * Cambio respecto a la lectura de hace ~`windowMin` minutos.
 * Devuelve null si no hay historia suficiente.
 */
export function computeTrend(
  readings: Reading[],
  key: "temperature" | "humidity",
  windowMin = 15,
): { delta: number; minutes: number } | null {
  if (readings.length < 2) return null;
  const last = readings[readings.length - 1];
  const target = last.ts - windowMin * 60_000;
  // Búsqueda binaria: primera lectura con ts >= target.
  let lo = 0;
  let hi = readings.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (readings[mid].ts < target) lo = mid + 1;
    else hi = mid;
  }
  const ref = readings[lo];
  const minutes = Math.round((last.ts - ref.ts) / 60_000);
  if (minutes < 5) return null;
  return { delta: last[key] - ref[key], minutes };
}
