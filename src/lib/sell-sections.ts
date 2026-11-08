// The "Category" and "Item" pickers on the sell form follow the shop menu:
// a section, then the items under it in the menu. Each item stores the
// category and type the menu pages filter by, so a listing shows up on the
// page the seller picked.

import type { Category } from "@/lib/listings.ts";
import { SUBCATEGORIES, type Subcategory } from "@/shared/subcategories.ts";

export type SellItem = {
  /** Unique key for the picker, "<section>:<item>" */
  key: string;
  label: string;
  category: Category;
  subcategory: Subcategory;
  /** Instant Content items are sold as locked photos or videos */
  instant?: boolean;
};

export type SellSection = { key: string; label: string; items: SellItem[] };

function section(
  key: string,
  label: string,
  items: [label: string, category: Category, subcategory: Subcategory, instant?: boolean][],
): SellSection {
  return {
    key,
    label,
    items: items.map(([itemLabel, category, subcategory, instant]) => ({
      key: `${key}:${subcategory}`,
      label: itemLabel,
      category,
      subcategory,
      instant,
    })),
  };
}

export const SELL_SECTIONS: SellSection[] = [
  section("underwear", "Used Underwear", [
    ["Panties", "panties", "panties"],
    ["Thongs", "panties", "thongs"],
    ["Lingerie", "lingerie", "lingerie"],
    ["Bras", "bras", "bras"],
  ]),
  section("shoes", "Used Shoes", [
    ["High Heels", "shoes", "high_heels"],
    ["Flat Shoes", "shoes", "flats"],
    ["Sneakers", "shoes", "sneakers"],
    ["Slippers", "shoes", "slippers"],
    ["Uniform Shoes", "shoes", "uniform_shoes"],
    ["Boots", "shoes", "boots"],
  ]),
  section("hosiery", "Used Hosiery", [
    ["Socks", "socks", "socks"],
    ["Pantyhose", "socks", "pantyhose"],
    ["Stockings", "socks", "stockings"],
    ["Feet Pics", "extras", "feet_pics"],
  ]),
  section("clothing", "Used Clothing", [
    ["Skirts", "clothing", "skirts"],
    ["Dresses", "clothing", "dresses"],
    ["Tops", "clothing", "tops"],
    ["Gym Clothes", "activewear", "gym_clothes"],
    ["Swimwear", "clothing", "swimwear"],
    ["Other Clothing", "clothing", "other_clothing"],
  ]),
  section("extras", "Naughty Extras", [
    ["Accessories", "extras", "accessories"],
    ["Photo Sets", "extras", "photo_sets"],
    ["Video Clips", "extras", "video_clips"],
    ["Experiences", "extras", "experiences"],
    ["Dick Ratings", "extras", "dick_ratings"],
    ["Sex Toys", "extras", "sex_toys"],
    ["Sexting", "extras", "sexting"],
  ]),
  section("instant", "Instant Content", [
    ["Instant Pics", "extras", "photo_sets", true],
    ["Instant Vids", "extras", "video_clips", true],
  ]),
  section("mens", "Used Mens", [
    ["Men's Underwear", "panties", "panties"],
    ["Men's Socks", "socks", "socks"],
    ["Men's Gym Clothes", "activewear", "gym_clothes"],
  ]),
];

export function findSellItem(key: string | undefined): SellItem | undefined {
  return SELL_SECTIONS.flatMap((s) => s.items).find((i) => i.key === key);
}

/** The picker entry for a saved listing's category and type (first match in menu order). */
export function sellItemFor(
  category: string | undefined,
  subcategory: string | undefined,
  instant = false,
): SellItem | undefined {
  // Listings from before types existed count as their category's main type
  subcategory ||= SUBCATEGORIES.find((s) => s.category === category && "isDefault" in s)?.value;
  const items = SELL_SECTIONS.flatMap((s) => s.items);
  return (
    items.find((i) => i.category === category && i.subcategory === subcategory && !!i.instant === instant) ??
    items.find((i) => i.category === category && i.subcategory === subcategory)
  );
}
