// Seller account settings: what they accept and offer (shown on their profile)
// and their notification and visibility choices. Shared by backend and frontend.

export const PAYMENT_METHODS = [
  "PayPal",
  "Cash App",
  "Venmo",
  "Zelle",
  "Bank transfer",
  "Wise",
  "Revolut",
  "Crypto",
  "Gift cards",
] as const;

export const OFFERINGS = [
  "Used panties",
  "Used bras",
  "Used lingerie",
  "Used socks & hosiery",
  "Used shoes",
  "Used gym clothes",
  "Used clothing",
  "Used sex toys",
  "Photo sets",
  "Video clips",
  "Feet pics",
  "Custom requests",
  "Sexting",
  "Dick ratings",
  "Experiences",
] as const;

type Choice = { value: string; label: string };
const YES_NO: Choice[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

/** Notifications & Visibility. `perDevice` rows are a switch for this device, not a saved choice. */
export const SETTING_FIELDS = [
  {
    key: "profilePrivate",
    label: "Set Profile to Private",
    choices: [
      { value: "no", label: "No - Keep my profile visible" },
      { value: "yes", label: "Yes - Make my profile private" },
    ],
    defaultValue: "no",
    hint: "A private profile can only be seen by you. Everyone else sees that it's private. Your listings can still be found and bought.",
  },
  {
    key: "emailNotifications",
    label: "Platform Email Notifications",
    choices: YES_NO,
    defaultValue: "yes",
    hint: "Get some platform notifications by email, for example when you receive a message. To reduce spam, we only send you a new email notification once every 6 hours.",
  },
  {
    key: "marketingEmails",
    label: "Marketing Emails",
    choices: YES_NO,
    defaultValue: "no",
    hint: "Get promotional emails such as newsletters, offers and information about new product features.",
  },
  {
    key: "webPush",
    label: "Web Push Notifications",
    choices: YES_NO,
    defaultValue: "no",
    hint: "Get instant notifications in your browser.",
    /** Shown as an on/off switch for this device, not saved with the other settings */
    perDevice: true,
  },
  {
    key: "messagesFrom",
    label: "Receive Messages From All Buyers",
    choices: [
      { value: "all", label: "Yes - Allow messages from all buyers" },
      { value: "existing", label: "No - Only buyers already talking to me" },
    ],
    defaultValue: "all",
    hint: "Choose No to stop new conversations. Buyers you're already talking to can still message you.",
  },
  {
    key: "promoteProfile",
    label: "Promote My Profile on the Site",
    choices: [
      { value: "no", label: "No - Don't promote my profile" },
      { value: "yes", label: "Yes - Show me as a top seller" },
    ],
    defaultValue: "no",
    hint: "When you're one of the month's top sellers, your profile picture can appear on the home page and link to your profile.",
  },
] as const;

export type SettingKey = (typeof SETTING_FIELDS)[number]["key"];

export type SellerSettings = Partial<Record<SettingKey, string>> & {
  paymentMethods?: string[];
  offerings?: string[];
};

/** Every setting with its default filled in. */
export function withDefaults(settings: SellerSettings | undefined): Required<
  Pick<SellerSettings, SettingKey>
> & { paymentMethods: string[]; offerings: string[] } {
  const out = { paymentMethods: settings?.paymentMethods ?? [], offerings: settings?.offerings ?? [] } as ReturnType<
    typeof withDefaults
  >;
  for (const f of SETTING_FIELDS) {
    (out as Record<string, unknown>)[f.key] = settings?.[f.key] ?? f.defaultValue;
  }
  return out;
}

/** Error message for the first invalid value, else null. */
export function invalidSetting(settings: SellerSettings): string | null {
  for (const f of SETTING_FIELDS) {
    const value = settings[f.key];
    if (value !== undefined && !f.choices.some((c) => c.value === value))
      return `Invalid choice for ${f.label}`;
  }
  const lists: [string, readonly string[], string[] | undefined][] = [
    ["payment method", PAYMENT_METHODS, settings.paymentMethods],
    ["offering", OFFERINGS, settings.offerings],
  ];
  for (const [name, allowed, chosen] of lists) {
    if (chosen?.some((x) => !allowed.includes(x))) return `Invalid ${name}`;
  }
  return null;
}

/** False when the seller only takes messages in conversations that already exist. */
export const acceptsNewMessages = (settings: SellerSettings | undefined) =>
  (settings?.messagesFrom ?? "all") !== "existing";
