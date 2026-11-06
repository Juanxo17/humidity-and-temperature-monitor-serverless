import { useNow } from "@/hooks/useNow";
import { formatAgo, formatTime } from "@/lib/format";
import type { Reading } from "@/lib/types";

const ONLINE_MAX_AGE_MS = 30_000;

interface HeaderProps {
  deviceId: string;
  devices: readonly string[];
  onDeviceChange: (id: string) => void;
  latest: Reading | null;
  /** false mientras no ha terminado la primera carga */
  ready: boolean;
}

export function Header({ deviceId, devices, onDeviceChange, latest, ready }: HeaderProps) {
  const now = useNow();
  const age = latest && now ? now - latest.received_at : null;
  const online = age !== null && age <= ONLINE_MAX_AGE_MS;
  const state: "connecting" | "online" | "offline" = !ready || now === 0 ? "connecting" : online ? "online" : "offline";

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
      <div className="flex min-w-0 items-center gap-3">
        <RackGlyph />
        <div className="min-w-0">
          <h1 className="text-[1.05rem] font-semibold tracking-tight text-text">Monitor de racks</h1>
          <p className="text-sm text-muted">Temperatura, humedad y ventilación del datacenter</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>Rack</span>
          <select
            value={deviceId}
            onChange={(e) => onDeviceChange(e.target.value)}
            className="h-9 rounded-lg border border-line bg-surface pl-3 pr-8 font-medium text-text transition-colors hover:border-line-strong"
          >
            {devices.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <div
          role="status"
          aria-live="polite"
          data-status={state === "online" ? "normal" : "unknown"}
          className="flex h-9 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-sm"
        >
          <span className="relative flex size-2.5" aria-hidden>
            {state === "online" && <span className="live-ping absolute inset-0 rounded-full bg-(--status)" />}
            <span className="relative size-2.5 rounded-full bg-(--status)" />
          </span>
          <span className="font-medium text-text">
            {state === "connecting" ? "Conectando" : state === "online" ? "En línea" : "Sin datos"}
          </span>
          {latest && now > 0 && (
            <span className="text-muted">
              <span className="sr-only">Última lectura: </span>
              {formatTime(latest.received_at)}
              <span className="hidden text-faint sm:inline"> ({formatAgo(age ?? 0)})</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

/** Pequeño ícono de rack: tres unidades con LED. */
function RackGlyph() {
  return (
    <svg viewBox="0 0 32 32" className="size-9 shrink-0" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#182330" stroke="#2e3f52" />
      {[8, 14.5, 21].map((y) => (
        <g key={y}>
          <rect x="8" y={y} width="16" height="4" rx="1.2" fill="#223040" />
          <circle cx="21.5" cy={y + 2} r="1" fill="#6cc4f5" />
        </g>
      ))}
    </svg>
  );
}
