// Pure age rules, shared by the backend and the frontend.

/** Members must be at least this old. */
export const MIN_AGE = 18;

/** "YYYY-MM-DD" as a real calendar date, or null. */
export function parseBirthDate(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  const real =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d;
  return real ? m[0] : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** True when someone born on `birthDate` ("YYYY-MM-DD") is at least MIN_AGE on `today` (UTC). */
export function isAdult(birthDate: string, today: Date): boolean {
  // Born on or before the same calendar day MIN_AGE years ago
  const cutoff = `${today.getUTCFullYear() - MIN_AGE}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;
  return birthDate <= cutoff;
}

/** Age in whole years on `today` (UTC). */
export function ageOn(birthDate: string, today: Date): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = today.getUTCFullYear() - y;
  const before =
    today.getUTCMonth() + 1 < m ||
    (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
  if (before) age -= 1;
  return age;
}
