// Taboo Coins: the site's own currency. 1 coin pays for $0.10 of an item or
// Instant Content, so a $50.00 item costs 500 coins. Coin packs have no
// bonus coins or discounts.

export type CoinPack = { coins: number; priceCents: number };

export const COIN_PACKS: readonly CoinPack[] = [
  { coins: 100, priceCents: 1149 },
  { coins: 250, priceCents: 2899 },
  { coins: 500, priceCents: 5749 },
  { coins: 1000, priceCents: 11499 },
  { coins: 2000, priceCents: 22999 },
  { coins: 4000, priceCents: 45999 },
];

/** What one coin pays for, in cents. */
export const COIN_VALUE_CENTS = 10;

/** Coins needed to pay a price in cents (1 coin = $0.10, rounded up to a whole coin). */
export const coinsFor = (priceCents: number) => Math.max(1, Math.ceil(Math.round(priceCents) / COIN_VALUE_CENTS));

/** Most coins an admin can grant in one go. */
export const GRANT_MAX = 100_000;

export const formatCoins = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "coin" : "coins"}`;
