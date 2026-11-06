import { useCallback, useEffect, useRef, useState } from "react";
import { fetchReadings } from "@/lib/api";
import type { Reading } from "@/lib/types";

const POLL_MS = 10_000;
const FAST_POLL_MS = 3_000;
/** Si llevamos más de esto sin datos (pestaña dormida, red caída), recargar el rango completo. */
const FULL_RELOAD_AFTER_MS = 45 * 60_000;

/** Anexa lecturas nuevas (ts mayor al último) y descarta las que salieron de la ventana. */
function mergeReadings(prev: Reading[], batch: Reading[], cutoff: number): Reading[] {
  const lastTs = prev.length ? prev[prev.length - 1].ts : -Infinity;
  const fresh = batch.filter((r) => r.ts > lastTs);
  let drop = 0;
  while (drop < prev.length && prev[drop].ts < cutoff) drop++;
  if (fresh.length === 0 && drop === 0) return prev; // misma referencia: React no redibuja
  return prev.slice(drop).concat(fresh);
}

interface Loaded {
  key: string;
  readings: Reading[];
}

/**
 * Lecturas de `deviceId` en las últimas `hours` horas, con polling cada 10 s
 * (3 s si `fastPoll`). Mantiene los datos previos en pantalla mientras carga.
 */
export function useReadings(deviceId: string, hours: number, fastPoll = false) {
  const key = `${deviceId}:${hours}`;
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Refs: valores que el bucle de polling lee sin reiniciarse.
  const intervalRef = useRef(POLL_MS);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    intervalRef.current = fastPoll ? FAST_POLL_MS : POLL_MS;
    if (fastPoll) kickRef.current();
  }, [fastPoll]);

  useEffect(() => {
    const loopKey = `${deviceId}:${hours}`;
    const controller = new AbortController();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let readings: Reading[] = [];
    let loaded = false;
    let lastOk = 0;

    async function tick() {
      if (inFlight || cancelled) return;
      inFlight = true;
      clearTimeout(timer);
      try {
        const full = !loaded || Date.now() - lastOk > FULL_RELOAD_AFTER_MS;
        const batch = await fetchReadings(deviceId, full ? hours : 1, controller.signal);
        if (cancelled) return;
        const next = full ? batch : mergeReadings(readings, batch, Date.now() - hours * 3_600_000);
        const changed = !loaded || next !== readings;
        readings = next;
        loaded = true;
        lastOk = Date.now();
        if (changed) setData({ key: loopKey, readings: next });
        setLoadError(null);
        setPollError(null);
      } catch (err) {
        if (cancelled || (err as Error).name === "AbortError") return;
        const message = (err as Error).message || "Error desconocido.";
        if (!loaded) setLoadError({ key: loopKey, message });
        else setPollError(message);
      } finally {
        inFlight = false;
        if (!cancelled) timer = setTimeout(tick, intervalRef.current);
      }
    }

    kickRef.current = () => void tick();
    tick();

    // Al volver a la pestaña, actualizar de inmediato.
    const onVisible = () => document.visibilityState === "visible" && void tick();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deviceId, hours, reloadToken]);

  const retry = useCallback(() => setReloadToken((t) => t + 1), []);
  const refreshNow = useCallback(() => kickRef.current(), []);

  return {
    /** Lecturas visibles (pueden ser del rango anterior mientras carga el nuevo). */
    readings: data?.readings ?? [],
    /** true si los datos en pantalla ya corresponden al rango pedido. */
    isCurrent: data?.key === key,
    isInitialLoading: data === null && loadError === null,
    loadError: loadError?.key === key && data?.key !== key ? loadError.message : null,
    pollError,
    retry,
    refreshNow,
  };
}
