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

/** Notifications & Visibility. `comingSoon` choices are saved but not acted on yet. */
export const SETTING_FIELDS = [
  {
    key: "profilePrivate",
    label: "Set Profile to Private",
    choices: [
      { value: "no", label: "No - Keep my profile visible" },
      { value: "yes", label: "Yes - Make my profile private" },
    ],
    defaultValue: "no",
    hint: "Setting your profile to private will limit access to your profile. To allow full access to your profile you will need to approve follow requests.",
    comingSoon: true,
  },
  {
    key: "siteVisibility",
    label: "Site Visibility",
    choices: [
      { value: "all", label: "All our sites - Maximise sales potential" },
      { value: "this", label: "This site only" },
    ],
    defaultValue: "all",
    hint: "Select whether your profile appears on all our sister sites or only on this one.",
    comingSoon: true,
  },
  {
    key: "emailNotifications",
    label: "Platform Email Notifications",
    choices: YES_NO,
    defaultValue: "yes",
    hint: "Get some platform notifications by email, for example when you receive a message. To reduce spam, we only send you a new email notification once every 6 hours.",
    comingSoon: true,
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
    comingSoon: true,
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
    key: "socialFeature",
    label: "Be Featured on our Social Media",
    choices: [
      { value: "no", label: "No - I do not want extra exposure" },
      { value: "yes", label: "Yes - Feature me for extra exposure" },
    ],
    defaultValue: "no",
    hint: "Get more exposure by being featured on our social media platforms.",
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
