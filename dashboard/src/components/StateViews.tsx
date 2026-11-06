/** Esqueleto con la misma forma que el dashboard: nada "salta" cuando llegan los datos. */
export function DashboardSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,380px)]" aria-busy="true" aria-label="Cargando lecturas">
      <div className="skeleton h-[19rem] rounded-2xl" />
      <div className="skeleton h-[19rem] rounded-2xl" />
      <div className="skeleton h-[30rem] rounded-2xl md:col-span-2 lg:col-span-1 lg:row-span-2" />
      <div className="skeleton h-[38rem] rounded-2xl md:col-span-2" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-2xl border border-crit/30 bg-surface p-8 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-crit/12 text-lg font-semibold text-crit" aria-hidden>
        !
      </div>
      <h2 className="mt-4 text-lg font-semibold text-text">No se pudieron cargar las lecturas</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <p className="mt-1 text-sm text-faint">El panel vuelve a intentarlo cada 10 segundos.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 h-9 rounded-lg bg-air px-4 text-sm font-semibold text-bg transition-[filter] hover:brightness-110"
      >
        Reintentar ahora
      </button>
    </div>
  );
}

export function EmptyState({
  deviceId,
  rangeLabel,
  onWiden,
}: {
  deviceId: string;
  rangeLabel: string;
  onWiden?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <svg viewBox="0 0 48 48" className="size-12 text-faint" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M4 30h8l4-10 6 18 5-12 3 4h14" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" />
      </svg>
      <h3 className="mt-4 text-base font-semibold text-text">Sin lecturas en {rangeLabel}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {deviceId} no ha publicado telemetría en este periodo. Revisa que la Raspberry Pi esté encendida y conectada a AWS IoT.
      </p>
      {onWiden && (
        <button
          type="button"
          onClick={onWiden}
          className="mt-5 h-9 rounded-lg border border-line bg-raised px-4 text-sm font-medium text-text transition-colors hover:border-line-strong"
        >
          Ver últimos 7 días
        </button>
      )}
    </div>
  );
}
