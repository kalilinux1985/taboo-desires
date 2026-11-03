export type SettingsKind = "seller" | "buyer";

/** Members without a chosen account type are treated as sellers, matching the rest of the app. */
export function settingsKindFor(accountType: SettingsKind | null): SettingsKind {
  return accountType === "buyer" ? "buyer" : "seller";
}

export function settingsPathFor(accountType: SettingsKind | null): string {
  return `/settings/${settingsKindFor(accountType)}`;
}
