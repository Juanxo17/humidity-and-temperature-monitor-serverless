import type { ChartPoint, Reading } from "./types";

/**
 * Largest-Triangle-Three-Buckets: elige `threshold` índices que conservan
 * la forma visual de la serie (picos incluidos), a diferencia de un promedio.
 */
function lttbIndices(xs: number[], ys: number[], threshold: number): number[] {
  const n = xs.length;
  if (threshold >= n || threshold < 3) return xs.map((_, i) => i);

  const out: number[] = [0];
  const bucketSize = (n - 2) / (threshold - 2);
  let a = 0;

  for (let i = 0; i < threshold - 2; i++) {
    // Promedio del siguiente bucket (punto "C" del triángulo).
    const nextStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n);
    let avgX = 0;
    let avgY = 0;
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += xs[j];
      avgY += ys[j];
    }
    const len = nextEnd - nextStart || 1;
    avgX /= len;
    avgY /= len;

    // En el bucket actual, el punto que forma el triángulo de mayor área con A y C.
    const start = Math.floor(i * bucketSize) + 1;
    const end = Math.floor((i + 1) * bucketSize) + 1;
    let maxArea = -1;
    let chosen = start;
    for (let j = start; j < end; j++) {
      const area = Math.abs((xs[a] - avgX) * (ys[j] - ys[a]) - (xs[a] - xs[j]) * (avgY - ys[a]));
      if (area > maxArea) {
        maxArea = area;
        chosen = j;
      }
    }
    out.push(chosen);
    a = chosen;
  }
  out.push(n - 1);
  return out;
}

/** Hueco mínimo (ms) para cortar la línea: ~6 lecturas perdidas, o más en rangos largos. */
function gapThreshold(rangeMs: number) {
  return Math.max(60_000, rangeMs / 250);
}

/**
 * Reduce a ~`maxPoints` puntos para las gráficas. Temperatura y humedad se
 * reducen por separado y se unen los índices: ambas gráficas comparten el eje X
 * (y el cursor sincronizado). Inserta `null` donde hubo huecos sin datos.
 */
export function toChartPoints(readings: Reading[], rangeHours: number, maxPoints = 500): ChartPoint[] {
  if (readings.length === 0) return [];

  const xs = readings.map((r) => r.ts);
  const half = Math.floor(maxPoints / 2);
  const idx = new Set([
    ...lttbIndices(xs, readings.map((r) => r.temperature), half),
    ...lttbIndices(xs, readings.map((r) => r.humidity), half),
  ]);
  const picked = [...idx].sort((p, q) => p - q);

  const gap = gapThreshold(rangeHours * 3_600_000);
  // Inicios de huecos en los datos crudos (lista ordenada).
  const gapStarts: number[] = [];
  for (let i = 1; i < readings.length; i++) {
    if (readings[i].ts - readings[i - 1].ts > gap) gapStarts.push(readings[i - 1].ts);
  }

  const out: ChartPoint[] = [];
  let g = 0;
  for (let k = 0; k < picked.length; k++) {
    const r = readings[picked[k]];
    if (k > 0) {
      // ¿Algún hueco entre el punto anterior y este? Entonces cortar la línea.
      const prevTs = readings[picked[k - 1]].ts;
      while (g < gapStarts.length && gapStarts[g] < prevTs) g++;
      if (g < gapStarts.length && gapStarts[g] < r.ts) {
        out.push({ ts: gapStarts[g] + 1, temperature: null, humidity: null, damper_angle: null });
        while (g < gapStarts.length && gapStarts[g] < r.ts) g++;
      }
    }
    out.push({ ts: r.ts, temperature: r.temperature, humidity: r.humidity, damper_angle: r.damper_angle });
  }
  return out;
}
