"use client";
// ↑ Frontera cliente/servidor: este archivo y todo lo que importa se ejecuta en el navegador.

import { useCallback, useMemo, useState } from "react";
import { useDamperCommand } from "@/hooks/useDamperCommand";
import { useReadings } from "@/hooks/useReadings";
import { downloadCsv } from "@/lib/csv";
import { toChartPoints } from "@/lib/downsample";
import { HUMIDITY, TEMPERATURE } from "@/lib/metrics";
import { computeStats, computeTrend } from "@/lib/stats";
import { DEVICES, RANGES, type RangeKey } from "@/lib/types";
import { DamperPanel } from "./DamperPanel";
import { Header } from "./Header";
import { HistoryPanel } from "./HistoryPanel";
import { KpiCard } from "./KpiCard";
import { DashboardSkeleton, ErrorState } from "./StateViews";

const MAX_CHART_POINTS = 500;

export function Dashboard() {
  const [deviceId, setDeviceId] = useState<string>(DEVICES[0]);
  const [range, setRange] = useState<RangeKey>("1h");
  const hours = RANGES.find((r) => r.key === range)!.hours;
  const rangeLong = RANGES.find((r) => r.key === range)!.long;

  // Necesitamos saber si hay un comando pendiente ANTES de llamar a useReadings
  // (para acelerar el polling); el estado del comando se guarda aquí.
  const [fastPoll, setFastPoll] = useState(false);

  const { readings, isCurrent, isInitialLoading, loadError, pollError, retry, refreshNow } = useReadings(
    deviceId,
    hours,
    fastPoll,
  );

  const latest = readings.length ? readings[readings.length - 1] : null;
  const { state: command, send, dismiss } = useDamperCommand(deviceId, latest, refreshNow);

  const pending = command.kind === "pending";
  if (pending !== fastPoll) setFastPoll(pending); // ajuste de estado durante el render

  // useMemo: recalcula solo cuando cambian las lecturas, no en cada render.
  const points = useMemo(() => toChartPoints(readings, hours, MAX_CHART_POINTS), [readings, hours]);
  const tempStats = useMemo(() => computeStats(readings, "temperature"), [readings]);
  const humStats = useMemo(() => computeStats(readings, "humidity"), [readings]);
  const tempTrend = useMemo(() => computeTrend(readings, "temperature"), [readings]);
  const humTrend = useMemo(() => computeTrend(readings, "humidity"), [readings]);

  const onDownload = useCallback(() => downloadCsv(readings, deviceId, range), [readings, deviceId, range]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 sm:pt-7 lg:px-8">
      <Header
        deviceId={deviceId}
        devices={DEVICES}
        onDeviceChange={setDeviceId}
        latest={latest}
        ready={!isInitialLoading}
      />

      {pollError && readings.length > 0 && (
        <p role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/6 px-3.5 py-2 text-sm text-warn">
          <span className="size-1.5 rounded-full bg-warn" aria-hidden />
          No se pudo actualizar: {pollError} Se reintentará automáticamente.
        </p>
      )}

      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : loadError && readings.length === 0 ? (
        <ErrorState message={loadError} onRetry={retry} />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,380px)]">
          <KpiCard
            metric={TEMPERATURE}
            value={latest?.temperature ?? null}
            stats={tempStats}
            trend={tempTrend}
            rangeLabel={rangeLong}
            stale={!isCurrent}
            className="rise lg:col-start-1 lg:row-start-1"
          />
          <KpiCard
            metric={HUMIDITY}
            value={latest?.humidity ?? null}
            stats={humStats}
            trend={humTrend}
            rangeLabel={rangeLong}
            stale={!isCurrent}
            className="rise [--delay:60ms] lg:col-start-2 lg:row-start-1"
          />
          <DamperPanel
            angle={latest?.damper_angle ?? null}
            command={command}
            onSend={send}
            onDismiss={dismiss}
            className="rise [--delay:120ms] md:col-span-2 lg:sticky lg:top-6 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:self-start"
          />
          <HistoryPanel
            deviceId={deviceId}
            range={range}
            onRangeChange={setRange}
            points={points}
            totalReadings={readings.length}
            loading={!isCurrent}
            onDownload={onDownload}
            className="rise [--delay:180ms] md:col-span-2 lg:col-start-1 lg:row-start-2"
          />
        </div>
      )}

      <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-line pt-5 text-xs text-faint">
        <span>Raspberry Pi + DHT11 → AWS IoT Core → DynamoDB. Actualización cada 10 s.</span>
        <span>Umbrales basados en ASHRAE TC 9.9. Horas en Colombia (UTC−5).</span>
      </footer>
    </main>
  );
}
