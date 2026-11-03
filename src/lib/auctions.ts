/** "2d 4h", "3h 12m", "4m 05s" style countdown. Returns "Ended" once time is up. */
export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "Ended";
  const totalSec = Math.floor(msLeft / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** Under an hour left: show the countdown in an urgent color. */
export const URGENT_MS = 60 * 60 * 1000;
