import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatAxis, formatDateTime, formatNumber } from "@/lib/format";
import { COLORS, HUMIDITY, STATUS_LABEL, TEMPERATURE, type MetricSpec } from "@/lib/metrics";
import type { ChartPoint } from "@/lib/types";

interface TelemetryChartProps {
  metric: MetricSpec;
  data: ChartPoint[];
  rangeHours: number;
  syncId: string;
}

/** Dominio Y: temperatura siempre muestra 18–32 con margen; humedad 0–100. */
function yDomain(metric: MetricSpec, data: ChartPoint[]): [number, number] {
  if (metric.key === "humidity") return [0, 100];
  let lo = 18;
  let hi = 32;
  for (const p of data) {
    const v = p.temperature;
    if (v === null) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [Math.floor(lo - 2), Math.ceil(hi + 2)];
}

export function TelemetryChart({ metric, data, rangeHours, syncId }: TelemetryChartProps) {
  const gradientId = useId();
  const domain = useMemo(() => yDomain(metric, data), [metric, data]);
  const boundaries = metric.bands.slice(1).map((b) => b.from);

  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} syncId={syncId} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.air} stopOpacity={0.22} />
              <stop offset="100%" stopColor={COLORS.air} stopOpacity={0} />
            </linearGradient>
          </defs>

          {metric.bands.map((b) => (
            <ReferenceArea
              key={b.from}
              y1={Math.max(b.from, domain[0])}
              y2={Math.min(b.to, domain[1])}
              fill={COLORS.status[b.status]}
              fillOpacity={b.status === "normal" ? 0.06 : 0.1}
              stroke="none"
              ifOverflow="hidden"
            />
          ))}
          <CartesianGrid vertical={false} stroke={COLORS.line} strokeDasharray="2 6" />
          {boundaries.map((y) => (
            <ReferenceLine
              key={y}
              y={y}
              stroke={COLORS.status[metric.classify(y + 0.01)]}
              strokeOpacity={0.45}
              strokeDasharray="4 4"
              ifOverflow="hidden"
            />
          ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => formatAxis(v, rangeHours)}
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: COLORS.line }}
            minTickGap={56}
            tickMargin={8}
          />
          <YAxis
            domain={domain}
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
            ticks={metric.key === "temperature" ? [domain[0], ...boundaries, domain[1]] : [0, 20, 40, 60, 80, 100]}
            interval={0}
            allowDecimals={false}
          />

          <Tooltip
            content={(props) => <ChartTooltip {...props} metric={metric} />}
            cursor={{ stroke: COLORS.muted, strokeOpacity: 0.6, strokeDasharray: "3 3" }}
            isAnimationActive={false}
          />

          <Area
            type="linear"
            dataKey={metric.key}
            name={metric.label}
            stroke={COLORS.air}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            connectNulls={false}
            isAnimationActive={false}
            dot={false}
            activeDot={(props: { cx?: number; cy?: number; payload?: ChartPoint }) => {
              const v = props.payload?.[metric.key];
              if (props.cx == null || props.cy == null || v == null) return <g />;
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill={COLORS.status[metric.classify(v)]}
                  stroke={COLORS.bg}
                  strokeWidth={2.5}
                />
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({ active, payload, metric }: TooltipContentProps<ValueType, NameType> & { metric: MetricSpec }) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;
  const value = point[metric.key];
  if (value === null) return null;

  const status = metric.classify(value);
  const other = metric.key === "temperature" ? HUMIDITY : TEMPERATURE;
  const otherValue = point[other.key];

  return (
    <div className="min-w-48 rounded-xl border border-line-strong bg-raised/95 px-3.5 py-3 text-sm shadow-[0_12px_40px_-12px_rgb(0_0_0/0.8)] backdrop-blur">
      <p className="text-xs text-muted">{formatDateTime(point.ts)}</p>
      <div className="mt-1.5 flex items-baseline justify-between gap-4" data-status={status}>
        <span className="text-xl font-semibold text-text" style={{ fontVariationSettings: "'wdth' 85" }}>
          {formatNumber(value)}
          <span className="ml-0.5 text-sm font-medium text-muted">{metric.unit}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--status)">
          <span className="size-1.5 rounded-full bg-(--status)" />
          {STATUS_LABEL[status]}
        </span>
      </div>
      <dl className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
        {otherValue !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{other.label}</dt>
            <dd className="text-text">
              {formatNumber(otherValue)} {other.unit}
            </dd>
          </div>
        )}
        {point.damper_angle !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Compuerta</dt>
            <dd className="text-text">{point.damper_angle}°</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
