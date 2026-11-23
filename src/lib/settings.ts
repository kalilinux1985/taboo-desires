export type SettingsKind = "seller" | "buyer";

/** Members without a chosen account type are treated as sellers, matching the rest of the app. */
export function settingsKindFor(accountType: SettingsKind | null): SettingsKind {
  return accountType === "buyer" ? "buyer" : "seller";
}

export function settingsPathFor(accountType: SettingsKind | null): string {
  return `/settings/${settingsKindFor(accountType)}`;
}

/** Every member must choose these in Settings after signing up (the site sends them there until done). */
export const REQUIRED_BASICS: readonly string[] = ["ageRange", "country", "gender"];

/** Paths a member who still has to choose them can open (Settings itself, the legal pages, sign-in links). */
export const BASICS_ALLOWED = ["/settings", "/auth", "/signin", "/terms", "/privacy", "/content-policy", "/copyright", "/report"];
