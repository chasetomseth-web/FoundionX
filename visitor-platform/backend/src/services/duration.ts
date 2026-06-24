/**
 * Time-on-site calculation logic.
 * All duration logic lives here — Merchant-OS never calculates this.
 */

export function calculateDurationSeconds(startTime: Date, endTime: Date | null): number | null {
  if (!endTime) return null;
  const diffMs = endTime.getTime() - startTime.getTime();
  if (diffMs <= 0) return null;
  return Math.round(diffMs / 1000);
}

/**
 * If session_end event is missing, use the last event timestamp as fallback.
 */
export function resolveEndTime(
  sessionEndTime: Date | null,
  lastEventTime: Date | null
): Date | null {
  return sessionEndTime ?? lastEventTime;
}