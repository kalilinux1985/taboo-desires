// Taboo Coins: the site's own currency. 1 coin pays for $0.01 of an item or
// Instant Content, so a $40.00 item costs 4,000 coins. Bigger packs come
// with bonus coins, which is how the site nudges members to pay with coins.

export type CoinPack = {
  coins: number;
  priceCents: number;
  /** Extra value over paying 1 cent per coin, as a whole percent (0 for none) */
  bonusPercent: number;
};

export const COIN_PACKS: readonly CoinPack[] = [
  { coins: 250, priceCents: 299, bonusPercent: 0 },
  { coins: 500, priceCents: 549, bonusPercent: 10 },
  { coins: 1000, priceCents: 999, bonusPercent: 15 },
  { coins: 1500, priceCents: 1449, bonusPercent: 20 },
  { coins: 2000, priceCents: 1899, bonusPercent: 25 },
  { coins: 2500, priceCents: 2299, bonusPercent: 30 },
];

/** Coins needed to pay a price in cents (1 coin = 1 cent). */
export const coinsFor = (priceCents: number) => Math.max(1, Math.round(priceCents));

/** Most coins an admin can grant in one go. */
export const GRANT_MAX = 100_000;

export const formatCoins = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "coin" : "coins"}`;
