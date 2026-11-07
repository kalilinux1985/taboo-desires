// Pure account-type rules, shared by the backend and the frontend.

/** Buyers can have this many profile photos; sellers have no limit. */
export const BUYER_PHOTO_MAX = 5;
/** How many of the newest profile photos the profile loads up front. */
export const PROFILE_PHOTO_PREVIEW = 6;

export type AccountType = "buyer" | "seller";

export type Capabilities = {
  /** Start discussions and reply on the community board */
  post: boolean;
  /** Send private messages (start or reply) */
  message: boolean;
  /** Create new listings */
  list: boolean;
  /** Bid, request locked content, send custom requests, contact a seller, review */
  buy: boolean;
};

/**
 * Buyers can post, message and buy for free but never list.
 * Sellers need Pro to post, message, or list, and never buy. Admins can do everything.
 */
export function capabilities(
  accountType: AccountType | undefined,
  isPro: boolean,
  isAdmin: boolean,
): Capabilities {
  if (isAdmin) return { post: true, message: true, list: true, buy: true };
  if (accountType === "buyer")
    return { post: true, message: true, list: false, buy: true };
  if (accountType === "seller")
    return { post: isPro, message: isPro, list: isPro, buy: false };
  return { post: false, message: false, list: false, buy: false };
}

const DENIED: Record<
  keyof Capabilities,
  Record<AccountType | "none", string>
> = {
  post: {
    buyer: "You can't post right now",
    seller: "Upgrade to Pro to post on the community board",
    none: "Choose an account type first",
  },
  message: {
    buyer: "You can't send messages right now",
    seller: "Upgrade to Pro to send and reply to messages",
    none: "Choose an account type first",
  },
  list: {
    buyer:
      "Buyer accounts can't create listings. Switch to a seller account to sell.",
    seller: "Upgrade to Pro to create listings",
    none: "Choose an account type first",
  },
  buy: {
    buyer: "You can't buy right now",
    seller: "Seller accounts can't buy. Use a buyer account to shop.",
    none: "Choose an account type first",
  },
};

export function deniedMessage(
  action: keyof Capabilities,
  accountType: AccountType | undefined,
): string {
  return DENIED[action][accountType ?? "none"];
}
