import { COLORS } from "@/lib/metrics";

const W = 320;
const TOP = 22;
const BOTTOM = 150;
const SLATS = 6;
const PIVOT_X = W / 2;
const SPACING = (BOTTOM - TOP) / SLATS;
const SLAT_LEN = SPACING * 1.18; // > espaciado: cerradas se superponen y forman un muro
const FLOWS = 5;

/** 0° servo (cerrada) → lamas verticales (90°); 180° (abierta) → horizontales (0°). */
const slatRotation = (angle: number) => 90 * (1 - angle / 180);

interface DamperVisualProps {
  /** Ángulo reportado por la telemetría (null = desconocido). */
  angle: number | null;
  /** Posición objetivo (vista previa del slider o comando pendiente). */
  ghost: number | null;
}

export function DamperVisual({ angle, ghost }: DamperVisualProps) {
  const known = angle !== null;
  const a = angle ?? 0;
  const open = a / 180; // 0..1
  const showGhost = ghost !== null && ghost !== angle;

  const pivots = Array.from({ length: SLATS }, (_, i) => TOP + SPACING * (i + 0.5));
  const flows = Array.from({ length: FLOWS }, (_, i) => TOP + ((BOTTOM - TOP) / FLOWS) * (i + 0.5));

  return (
    <svg
      viewBox={`0 0 ${W} 172`}
      className="w-full"
      role="img"
      aria-label={
        known
          ? `Compuerta a ${a} grados${showGhost ? `, objetivo ${ghost} grados` : ""}`
          : "Posición de la compuerta desconocida"
      }
    >
      <defs>
        <linearGradient id="duct-fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="0">
          <stop offset="0" stopColor={COLORS.air} stopOpacity="0" />
          <stop offset="0.15" stopColor={COLORS.air} stopOpacity="1" />
          <stop offset="0.85" stopColor={COLORS.air} stopOpacity="1" />
          <stop offset="1" stopColor={COLORS.air} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="slat-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4f66" />
          <stop offset="1" stopColor="#24364a" />
        </linearGradient>
      </defs>

      {/* paredes del ducto */}
      <line x1="0" x2={W} y1={TOP - 8} y2={TOP - 8} stroke={COLORS.line} strokeWidth="2" />
      <line x1="0" x2={W} y1={BOTTOM + 8} y2={BOTTOM + 8} stroke={COLORS.line} strokeWidth="2" />
      {/* marco de la compuerta */}
      <rect x={PIVOT_X - 22} y={TOP - 12} width="44" height={BOTTOM - TOP + 24} rx="6" fill="none" stroke={COLORS.line} />

      {/* aire: antes de la compuerta (siempre) y después (según apertura) */}
      <g stroke="url(#duct-fade)" strokeWidth="1.5" strokeLinecap="round" fill="none">
        {flows.map((y, i) => (
          <g key={y}>
            <line
              x1="0"
              x2={PIVOT_X - 30}
              y1={y}
              y2={y}
              strokeDasharray="10 22"
              className="airflow"
              opacity={known ? 0.55 : 0.15}
              style={{ ["--flow-duration" as string]: `${3.4 - 1.8 * open}s`, animationDelay: `${-i * 0.37}s` }}
            />
            <line
              x1={PIVOT_X + 30}
              x2={W}
              y1={y}
              y2={y}
              strokeDasharray="10 22"
              className="airflow transition-opacity duration-700"
              opacity={known ? 0.04 + 0.86 * open : 0.05}
              style={{ ["--flow-duration" as string]: `${3.4 - 2.4 * open}s`, animationDelay: `${-i * 0.37}s` }}
            />
          </g>
        ))}
      </g>

      {/* objetivo (silueta punteada) */}
      {showGhost &&
        pivots.map((y) => (
          <rect
            key={`g${y}`}
            x={PIVOT_X - SLAT_LEN / 2}
            y={y - 2.5}
            width={SLAT_LEN}
            height="5"
            rx="2.5"
            fill="none"
            stroke={COLORS.air}
            strokeDasharray="3 3"
            opacity="0.8"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              transform: `rotate(${slatRotation(ghost!)}deg)`,
              transition: "transform 300ms var(--ease-out-soft)",
            }}
          />
        ))}

      {/* lamas reales */}
      {pivots.map((y) => (
        <g key={y}>
          <rect
            x={PIVOT_X - SLAT_LEN / 2}
            y={y - 2.5}
            width={SLAT_LEN}
            height="5"
            rx="2.5"
            fill="url(#slat-fill)"
            stroke={known ? "#4a6582" : COLORS.line}
            strokeWidth="1"
            opacity={known ? 1 : 0.5}
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              transform: `rotate(${slatRotation(a)}deg)`,
              transition: "transform 700ms var(--ease-out-soft)",
            }}
          />
          <circle cx={PIVOT_X} cy={y} r="1.6" fill={COLORS.muted} />
        </g>
      ))}
    </svg>
  );
}
