/** Formateadores en hora de Colombia, sin importar la zona horaria del navegador. */
export const TZ = "America/Bogota";
const LOCALE = "es-CO";

const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const hmFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
});

const fullFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export const formatTime = (ms: number) => timeFmt.format(ms);
export const formatDateTime = (ms: number) => fullFmt.format(ms);

/** Etiquetas del eje X: horas para rangos cortos, día para 7 días. */
export function formatAxis(ms: number, rangeHours: number) {
  return rangeHours > 24 ? dayFmt.format(ms) : hmFmt.format(ms);
}

export function formatNumber(value: number, decimals = 0) {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** "hace 4 s", "hace 3 min", "hace 2 h", "hace 3 d" */
export function formatAgo(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}
