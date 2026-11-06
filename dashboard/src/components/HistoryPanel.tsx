import { formatNumber } from "@/lib/format";
import { HUMIDITY, STATUS_LABEL, TEMPERATURE, type MetricSpec } from "@/lib/metrics";
import { RANGES, type ChartPoint, type RangeKey } from "@/lib/types";
import { EmptyState } from "./StateViews";
import { TelemetryChart } from "./TelemetryChart";

interface HistoryPanelProps {
  deviceId: string;
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  points: ChartPoint[];
  totalReadings: number;
  loading: boolean;
  onDownload: () => void;
  className?: string;
}

export function HistoryPanel({
  deviceId,
  range,
  onRangeChange,
  points,
  totalReadings,
  loading,
  onDownload,
  className = "",
}: HistoryPanelProps) {
  const r = RANGES.find((x) => x.key === range)!;
  const empty = !loading && totalReadings === 0;

  return (
    <section aria-labelledby="history-title" className={`relative overflow-hidden rounded-2xl border border-line bg-surface ${className}`}>
      {/* barra de progreso al cambiar de rango */}
      <div className={`absolute inset-x-0 top-0 h-0.5 overflow-hidden transition-opacity ${loading ? "opacity-100" : "opacity-0"}`} aria-hidden>
        <div className="indeterminate h-full w-2/5 bg-air" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 id="history-title" className="text-base font-semibold text-text">
            Historial
          </h2>
          <p className="text-sm text-muted" aria-live="polite">
            {loading
              ? "Cargando lecturas…"
              : `${formatNumber(totalReadings)} lecturas en ${r.long}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Rango de tiempo" className="flex rounded-lg border border-line bg-bg/60 p-0.5">
            {RANGES.map((x) => (
              <button
                key={x.key}
                type="button"
                aria-pressed={x.key === range}
                onClick={() => onRangeChange(x.key)}
                className={`h-8 rounded-md px-3 text-sm font-medium transition-colors duration-200 ${
                  x.key === range ? "bg-raised text-text shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : "text-muted hover:text-text"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onDownload}
            disabled={totalReadings === 0 || loading}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-raised px-3 text-sm font-medium text-text transition-colors hover:border-line-strong hover:bg-line/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M8 2.5v8m0 0L4.75 7.25M8 10.5l3.25-3.25M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Descargar CSV
          </button>
        </div>
      </div>

      {empty ? (
        <EmptyState deviceId={deviceId} rangeLabel={r.long} onWiden={range !== "7d" ? () => onRangeChange("7d") : undefined} />
      ) : (
        <div className={`divide-y divide-line transition-opacity duration-300 ${loading ? "opacity-50" : ""}`}>
          {[TEMPERATURE, HUMIDITY].map((m) => (
            <div key={m.key} className="px-3 pb-4 pt-4 sm:px-4">
              <ChartHeading metric={m} />
              <TelemetryChart metric={m} data={points} rangeHours={r.hours} syncId="telemetry" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Título de la gráfica con leyenda de las bandas de umbral. */
function ChartHeading({ metric }: { metric: MetricSpec }) {
  const [crLow, normal, warn] = metric.bands;
  const u = metric.unit;
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
      <h3 className="text-sm font-medium text-text">
        {metric.label} <span className="font-normal text-muted">({u})</span>
      </h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li data-status="normal" className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-(--status) opacity-70" aria-hidden />
          {STATUS_LABEL.normal} {normal.from}–{normal.to}
        </li>
        <li data-status="warning" className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-(--status) opacity-70" aria-hidden />
          {STATUS_LABEL.warning} {warn.from}–{warn.to}
        </li>
        <li data-status="critical" className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-(--status) opacity-70" aria-hidden />
          {STATUS_LABEL.critical} &lt;{crLow.to} o &gt;{warn.to}
        </li>
      </ul>
    </div>
  );
}
