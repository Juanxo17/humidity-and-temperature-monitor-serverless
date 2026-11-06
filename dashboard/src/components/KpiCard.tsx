import { formatNumber } from "@/lib/format";
import { STATUS_LABEL, type MetricSpec, type Status } from "@/lib/metrics";
import type { Stats } from "@/lib/stats";

interface KpiCardProps {
  metric: MetricSpec;
  value: number | null;
  stats: Stats | null;
  trend: { delta: number; minutes: number } | null;
  rangeLabel: string;
  /** Atenúa mientras llegan los datos del rango nuevo. */
  stale?: boolean;
  className?: string;
}

export function KpiCard({ metric, value, stats, trend, rangeLabel, stale, className = "" }: KpiCardProps) {
  const status: Status | "unknown" = value === null ? "unknown" : metric.classify(value);

  return (
    <section
      data-status={status}
      aria-labelledby={`kpi-${metric.key}`}
      className={`group relative flex flex-col rounded-2xl border bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:shadow-[0_8px_30px_-12px_rgb(0_0_0/0.6)] sm:p-6 ${
        status === "warning" || status === "critical"
          ? "border-[color-mix(in_oklab,var(--status)_40%,var(--color-line))]"
          : "border-line hover:border-line-strong"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`kpi-${metric.key}`} className="text-sm font-medium text-muted">
          {metric.label}
        </h2>
        {status !== "unknown" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--status)_14%,transparent)] px-2.5 py-1 text-xs font-medium text-(--status)">
            <span className="size-1.5 rounded-full bg-(--status)" aria-hidden />
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      <p className="mt-3 flex items-baseline gap-1.5" aria-live="polite">
        <span
          key={value ?? "none"}
          className="value-tick font-display text-[3.75rem] font-semibold leading-none tracking-[-0.02em] text-text sm:text-[4.25rem]"
          style={{ fontVariationSettings: "'wdth' 78" }}
        >
          {value === null ? "—" : formatNumber(value)}
        </span>
        <span className="text-xl font-medium text-muted">{metric.unit}</span>
      </p>

      <p className="mt-2 min-h-5 text-sm text-muted">
        {trend ? <TrendText delta={trend.delta} minutes={trend.minutes} unit={metric.unit} /> : value === null ? "Sin lecturas en el rango" : " "}
      </p>

      <ThresholdBar metric={metric} value={value} stats={stats} />

      <dl
        className={`mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 transition-opacity ${stale ? "opacity-50" : ""}`}
      >
        {(
          [
            ["Mín", stats?.min, 0],
            ["Promedio", stats?.avg, 1],
            ["Máx", stats?.max, 0],
          ] as const
        ).map(([label, v, dec]) => (
          <div key={label}>
            <dt className="text-xs text-faint">{label}</dt>
            <dd className="mt-0.5 text-base font-medium text-text">
              {v === undefined ? "—" : formatNumber(v, dec)}
              <span className="ml-0.5 text-sm text-muted">{metric.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-faint">En {rangeLabel}</p>
    </section>
  );
}

function TrendText({ delta, minutes, unit }: { delta: number; minutes: number; unit: string }) {
  if (delta === 0) return <>Estable en los últimos {minutes} min</>;
  const up = delta > 0;
  return (
    <>
      <span aria-hidden className="mr-1 inline-block text-text">
        {up ? "↑" : "↓"}
      </span>
      {up ? "Subió" : "Bajó"} {formatNumber(Math.abs(delta))} {unit} en {minutes} min
    </>
  );
}

/** Regla con las bandas de umbral, marcador del valor actual y corchete mín–máx. */
function ThresholdBar({ metric, value, stats }: { metric: MetricSpec; value: number | null; stats: Stats | null }) {
  const [s0, s1] = metric.scale;
  const pct = (v: number) => ((Math.min(s1, Math.max(s0, v)) - s0) / (s1 - s0)) * 100;
  const ticks = metric.bands.slice(1).map((b) => b.from);

  return (
    <div className="mt-5" aria-hidden>
      <div className="relative h-5">
        {/* corchete mín–máx del rango */}
        {stats && (
          <div
            className="absolute top-0 h-1.5 rounded-t border-x border-t border-muted/60 transition-all duration-700 ease-(--ease-out-soft)"
            style={{ left: `${pct(stats.min)}%`, width: `max(2px, ${pct(stats.max) - pct(stats.min)}%)` }}
          />
        )}
        {/* bandas */}
        <div className="absolute inset-x-0 bottom-0 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          {metric.bands.map((b) => {
            const from = pct(Math.max(b.from, s0));
            const to = pct(Math.min(b.to, s1));
            return (
              <div
                key={b.from}
                data-status={b.status}
                className="h-full bg-(--status) opacity-35"
                style={{ flex: `${to - from} 1 0` }}
              />
            );
          })}
        </div>
        {/* marcador */}
        {value !== null && (
          <div
            className="absolute bottom-[-4px] h-3.5 w-1 -translate-x-1/2 rounded-full bg-text shadow-[0_0_0_3px_var(--color-surface),0_0_12px_var(--status)] transition-[left] duration-700 ease-(--ease-out-soft)"
            style={{ left: `${pct(value)}%` }}
          />
        )}
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] text-faint">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
