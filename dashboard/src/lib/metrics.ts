/**
 * Umbrales para salas de datos basados en ASHRAE TC 9.9.
 * Un solo lugar de verdad: tarjetas, gráficas y colores salen de aquí.
 */

export type Status = "normal" | "warning" | "critical";

export interface Band {
  from: number;
  to: number;
  status: Status;
}

export interface MetricSpec {
  key: "temperature" | "humidity";
  label: string;
  unit: string;
  /** Escala de la barra de umbrales de la tarjeta KPI. */
  scale: [number, number];
  bands: Band[];
  classify: (value: number) => Status;
}

export const TEMPERATURE: MetricSpec = {
  key: "temperature",
  label: "Temperatura",
  unit: "°C",
  scale: [10, 40],
  bands: [
    { from: -Infinity, to: 18, status: "critical" },
    { from: 18, to: 27, status: "normal" },
    { from: 27, to: 32, status: "warning" },
    { from: 32, to: Infinity, status: "critical" },
  ],
  classify: (v) => (v < 18 ? "critical" : v <= 27 ? "normal" : v <= 32 ? "warning" : "critical"),
};

export const HUMIDITY: MetricSpec = {
  key: "humidity",
  label: "Humedad",
  unit: "%",
  scale: [0, 100],
  bands: [
    { from: -Infinity, to: 20, status: "critical" },
    { from: 20, to: 60, status: "normal" },
    { from: 60, to: 80, status: "warning" },
    { from: 80, to: Infinity, status: "critical" },
  ],
  classify: (v) => (v < 20 ? "critical" : v <= 60 ? "normal" : v <= 80 ? "warning" : "critical"),
};

export const STATUS_LABEL: Record<Status, string> = {
  normal: "Normal",
  warning: "Advertencia",
  critical: "Crítico",
};

/**
 * Colores en TS para los SVG de Recharts (deben coincidir con globals.css).
 * Los atributos SVG no siempre aceptan var(--x), por eso se duplican aquí.
 */
export const COLORS = {
  bg: "#0D141C",
  surface: "#131C26",
  line: "#223040",
  muted: "#8A9BAE",
  text: "#E6EDF3",
  air: "#6CC4F5",
  status: {
    normal: "#4FBF8B",
    warning: "#E7A93C",
    critical: "#F0626A",
  } satisfies Record<Status, string>,
};

export type DamperPosition = "Cerrada" | "Parcial" | "Abierta";

export function damperPosition(angle: number): DamperPosition {
  if (angle <= 2) return "Cerrada";
  if (angle >= 178) return "Abierta";
  return "Parcial";
}

export const DAMPER_PRESETS = [
  { label: "Cerrar", angle: 0 },
  { label: "Media", angle: 90 },
  { label: "Abrir", angle: 180 },
] as const;
