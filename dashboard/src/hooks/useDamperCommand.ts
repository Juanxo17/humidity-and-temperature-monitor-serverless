import { useCallback, useEffect, useState } from "react";
import { sendDamperCommand } from "@/lib/api";

/** Tras este tiempo sin confirmación se muestra un aviso (el comando sigue pendiente). */
const CONFIRM_WARN_MS = 60_000;

export type CommandState =
  | { kind: "idle" }
  | { kind: "sending"; target: number }
  | { kind: "pending"; target: number; baselineTs: number; slow: boolean }
  | { kind: "confirmed"; target: number }
  | { kind: "error"; target: number; message: string };

/**
 * Envía comandos a la compuerta y sigue su ciclo de vida hasta que la
 * telemetría (`latest`) reporta el ángulo pedido.
 */
export function useDamperCommand(
  deviceId: string,
  latest: { ts: number; damper_angle: number } | null,
  onAccepted?: () => void,
) {
  const [state, setState] = useState<CommandState>({ kind: "idle" });

  // Ajuste de estado durante el render: la lectura nueva confirma el comando.
  if (
    state.kind === "pending" &&
    latest &&
    latest.ts > state.baselineTs &&
    latest.damper_angle === state.target
  ) {
    setState({ kind: "confirmed", target: state.target });
  }

  // Aviso si tarda demasiado en confirmarse.
  const pendingTarget = state.kind === "pending" ? state.target : null;
  const pendingSince = state.kind === "pending" ? state.baselineTs : null;
  useEffect(() => {
    if (pendingTarget === null) return;
    const t = setTimeout(
      () => setState((s) => (s.kind === "pending" && s.target === pendingTarget ? { ...s, slow: true } : s)),
      CONFIRM_WARN_MS,
    );
    return () => clearTimeout(t);
  }, [pendingTarget, pendingSince]);

  // El mensaje "confirmado" se retira solo después de unos segundos.
  useEffect(() => {
    if (state.kind !== "confirmed") return;
    const t = setTimeout(() => setState((s) => (s.kind === "confirmed" ? { kind: "idle" } : s)), 6000);
    return () => clearTimeout(t);
  }, [state.kind]);

  const send = useCallback(
    async (angle: number) => {
      const target = Math.round(Math.min(180, Math.max(0, angle)));
      const baselineTs = latest?.ts ?? 0;
      setState({ kind: "sending", target });
      try {
        await sendDamperCommand(deviceId, target);
        setState({ kind: "pending", target, baselineTs, slow: false });
        onAccepted?.();
      } catch (err) {
        setState({ kind: "error", target, message: (err as Error).message });
      }
    },
    [deviceId, latest?.ts, onAccepted],
  );

  const dismiss = useCallback(() => setState({ kind: "idle" }), []);

  return { state, send, dismiss };
}
