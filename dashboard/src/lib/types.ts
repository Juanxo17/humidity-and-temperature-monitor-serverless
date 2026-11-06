/** Una lectura tal como la devuelve GET /readings. */
export interface Reading {
  device_id: string;
  /** Momento de la medición en la Raspberry Pi (epoch en ms). */
  ts: number;
  /** Momento en que AWS recibió el mensaje (epoch en ms). */
  received_at: number;
  /** °C */
  temperature: number;
  /** % de humedad relativa */
  humidity: number;
  /** Ángulo del servo de la compuerta, 0–180 */
  damper_angle: number;
}

/** Punto para las gráficas. `null` corta la línea cuando hay un hueco sin datos. */
export interface ChartPoint {
  ts: number;
  temperature: number | null;
  humidity: number | null;
  damper_angle: number | null;
}

export type RangeKey = "1h" | "6h" | "24h" | "7d";

export const RANGES: { key: RangeKey; hours: number; label: string; long: string }[] = [
  { key: "1h", hours: 1, label: "1 h", long: "la última hora" },
  { key: "6h", hours: 6, label: "6 h", long: "las últimas 6 horas" },
  { key: "24h", hours: 24, label: "24 h", long: "las últimas 24 horas" },
  { key: "7d", hours: 168, label: "7 días", long: "los últimos 7 días" },
];

/** Racks disponibles. Hoy solo hay uno; el selector ya está preparado para más. */
export const DEVICES = ["rack01"] as const;
