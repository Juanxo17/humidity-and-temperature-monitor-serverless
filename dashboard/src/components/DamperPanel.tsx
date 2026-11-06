import { useId, useState, type ReactNode } from "react";
import type { CommandState } from "@/hooks/useDamperCommand";
import { DAMPER_PRESETS, damperPosition } from "@/lib/metrics";
import { DamperVisual } from "./DamperVisual";

interface DamperPanelProps {
  /** Ángulo reportado por la telemetría. */
  angle: number | null;
  command: CommandState;
  onSend: (angle: number) => void;
  onDismiss: () => void;
  className?: string;
}

export function DamperPanel({ angle, command, onSend, onDismiss, className = "" }: DamperPanelProps) {
  const sliderId = useId();
  // null = el slider sigue a la telemetría; número = el usuario lo está moviendo.
  const [draft, setDraft] = useState<number | null>(null);

  const sliderValue = draft ?? angle ?? 0;
  const sending = command.kind === "sending";
  const inFlightTarget = command.kind === "sending" || command.kind === "pending" ? command.target : null;
  const ghost = draft !== null && draft !== angle ? draft : inFlightTarget;

  const send = (value: number) => {
    setDraft(null);
    onSend(value);
  };

  return (
    <section
      aria-labelledby="damper-title"
      className={`rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="damper-title" className="text-sm font-medium text-muted">
            Compuerta de ventilación
          </h2>
          <p className="mt-3 flex items-baseline gap-3">
            <span
              key={angle ?? "none"}
              className="value-tick font-display text-[3.75rem] font-semibold leading-none tracking-[-0.02em] sm:text-[4.25rem]"
              style={{ fontVariationSettings: "'wdth' 78" }}
            >
              {angle === null ? "—" : `${angle}°`}
            </span>
            {angle !== null && <span className="text-lg font-medium text-text">{damperPosition(angle)}</span>}
          </p>
        </div>
      </div>

      <div className="grid gap-x-8 md:grid-cols-2 md:items-center lg:grid-cols-1">
        <div className="mt-5">
          <div className="rounded-xl border border-line bg-bg/60 px-2 pt-2">
            <DamperVisual angle={angle} ghost={ghost} />
          </div>
          <div className="mt-2 flex justify-between px-1 text-xs text-faint">
            <span>Pasillo frío</span>
            <span>Interior del rack</span>
          </div>
        </div>

        <div className="mt-6">
          <div role="group" aria-label="Posiciones predefinidas" className="grid grid-cols-3 gap-2">
            {DAMPER_PRESETS.map((p) => {
              const current = angle === p.angle;
              const target = inFlightTarget === p.angle;
              return (
                <button
                  key={p.angle}
                  type="button"
                  disabled={sending}
                  aria-pressed={current}
                  onClick={() => send(p.angle)}
                  className={`group/btn flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
                    current
                      ? "border-air/60 bg-air/12 text-text"
                      : target
                        ? "border-air/40 border-dashed bg-raised text-text"
                        : "border-line bg-raised text-text hover:border-line-strong hover:bg-line/60"
                  }`}
                >
                  {p.label}
                  <span className="text-xs font-normal text-muted">{p.angle}°</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <label htmlFor={sliderId} className="text-sm text-muted">
                Ángulo personalizado
              </label>
              <output htmlFor={sliderId} className="text-sm font-medium text-text">
                {sliderValue}°
              </output>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <input
                id={sliderId}
                type="range"
                min={0}
                max={180}
                step={1}
                value={sliderValue}
                onChange={(e) => setDraft(Number(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && draft !== null && send(draft)}
                className="damper-range"
                style={{ ["--fill" as string]: `${(sliderValue / 180) * 100}%` }}
              />
              <button
                type="button"
                disabled={sending || draft === null}
                onClick={() => draft !== null && send(draft)}
                className="h-9 shrink-0 rounded-lg bg-air px-4 text-sm font-semibold text-bg transition-[filter,opacity,transform] hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Enviar
              </button>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-faint" aria-hidden>
              <span>0° cerrada</span>
              <span>180° abierta</span>
            </div>
          </div>

          <CommandStatus command={command} onRetry={() => command.kind === "error" && send(command.target)} onDismiss={onDismiss} />
        </div>
      </div>
    </section>
  );
}

function CommandStatus({
  command,
  onRetry,
  onDismiss,
}: {
  command: CommandState;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  let tone: "neutral" | "air" | "normal" | "warning" | "critical" = "neutral";
  let icon: ReactNode = null;
  let title = "";
  let detail = "";

  switch (command.kind) {
    case "idle":
      title = "Listo para recibir comandos";
      detail = "La posición se confirma con la siguiente lectura del rack.";
      break;
    case "sending":
      tone = "air";
      icon = <span className="spin size-3.5 rounded-full border-2 border-air/30 border-t-air" />;
      title = `Enviando ${command.target}°`;
      detail = "Publicando el comando en AWS IoT.";
      break;
    case "pending":
      tone = command.slow ? "warning" : "air";
      icon = (
        <span className="relative flex size-2">
          <span className="live-ping absolute inset-0 rounded-full bg-current" />
          <span className="relative size-2 rounded-full bg-current" />
        </span>
      );
      title = "Pendiente de confirmación";
      detail = command.slow
        ? `El rack aún no reporta ${command.target}°. Revisa que el dispositivo esté en línea.`
        : `Esperando que la telemetría reporte ${command.target}°.`;
      break;
    case "confirmed":
      tone = "normal";
      icon = <span aria-hidden>✓</span>;
      title = `Compuerta en ${command.target}°`;
      detail = "Confirmado por la telemetría del rack.";
      break;
    case "error":
      tone = "critical";
      icon = <span aria-hidden>!</span>;
      title = "No se pudo enviar el comando";
      detail = command.message;
      break;
  }

  const toneClass = {
    neutral: "border-line text-muted",
    air: "border-air/30 bg-air/6 text-air",
    normal: "border-ok/30 bg-ok/6 text-ok",
    warning: "border-warn/30 bg-warn/6 text-warn",
    critical: "border-crit/30 bg-crit/6 text-crit",
  }[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-5 flex min-h-[4.25rem] items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors duration-300 ${toneClass}`}
    >
      {icon && <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center font-semibold">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-muted">{detail}</p>
      </div>
      {command.kind === "error" && (
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onRetry} className="rounded-md px-2 py-1 font-medium text-text hover:bg-line/60">
            Reintentar
          </button>
          <button type="button" onClick={onDismiss} aria-label="Cerrar aviso" className="rounded-md px-2 py-1 text-muted hover:bg-line/60">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
