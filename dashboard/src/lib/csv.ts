import { TZ } from "./format";
import type { Reading } from "./types";

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function bogotaParts(ms: number) {
  const p = Object.fromEntries(partsFmt.formatToParts(ms).map((x) => [x.type, x.value]));
  return {
    y: +p.year,
    mo: +p.month,
    d: +p.day,
    h: +p.hour,
    mi: +p.minute,
    s: +p.second,
  };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** ISO 8601 en hora de Colombia, con offset: 2026-11-06T10:42:07.648-05:00 */
export function toBogotaISO(ms: number) {
  const { y, mo, d, h, mi, s } = bogotaParts(ms);
  const millis = ((ms % 1000) + 1000) % 1000;
  // Offset calculado (no fijo) por si la zona cambiara algún día.
  const offsetMin = Math.round((Date.UTC(y, mo - 1, d, h, mi, s) - (ms - millis)) / 60_000);
  const sign = offsetMin < 0 ? "-" : "+";
  const abs = Math.abs(offsetMin);
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}.${pad(millis, 3)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Fecha local de Colombia para el nombre del archivo: 2026-11-06_1042 */
function fileStamp(ms: number) {
  const { y, mo, d, h, mi } = bogotaParts(ms);
  return `${y}-${pad(mo)}-${pad(d)}_${pad(h)}${pad(mi)}`;
}

export function buildCsv(readings: Reading[]) {
  const header = "fecha_hora,device_id,temperatura_c,humedad_pct,compuerta_grados,latencia_ms";
  const rows = readings.map((r) =>
    [
      toBogotaISO(r.ts),
      r.device_id,
      r.temperature,
      r.humidity,
      r.damper_angle,
      r.received_at - r.ts,
    ].join(","),
  );
  return [header, ...rows].join("\r\n") + "\r\n";
}

/** Descarga en el navegador: crea un Blob y simula el clic en un enlace temporal. */
export function downloadCsv(readings: Reading[], deviceId: string, rangeKey: string) {
  // BOM UTF-8 para que Excel reconozca los acentos.
  const blob = new Blob(["﻿" + buildCsv(readings)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deviceId}_${rangeKey}_${fileStamp(Date.now())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
