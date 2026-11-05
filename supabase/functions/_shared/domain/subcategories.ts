// Sub-categories sellers pick under a category, used by the shop menu and Browse.
// A category's `isDefault` sub-category also matches its older listings that
// have none, so "Used Panties" still finds panties listed before sub-categories.

import type { Category } from "./enums.ts";

export const SUBCATEGORIES = [
  { value: "panties", label: "Panties", category: "panties", isDefault: true },
  { value: "thongs", label: "Thongs", category: "panties" },
  { value: "bras", label: "Bras", category: "bras", isDefault: true },
  { value: "lingerie", label: "Lingerie", category: "lingerie", isDefault: true },
  { value: "socks", label: "Socks", category: "socks", isDefault: true },
  { value: "pantyhose", label: "Pantyhose", category: "socks" },
  { value: "stockings", label: "Stockings", category: "socks" },
  { value: "high_heels", label: "High heels", category: "shoes" },
  { value: "flats", label: "Flat shoes", category: "shoes" },
  { value: "sneakers", label: "Sneakers", category: "shoes" },
  { value: "slippers", label: "Slippers", category: "shoes" },
  { value: "uniform_shoes", label: "Uniform shoes", category: "shoes" },
  { value: "boots", label: "Boots", category: "shoes" },
  { value: "gym_clothes", label: "Gym clothes", category: "activewear", isDefault: true },
  { value: "skirts", label: "Skirts", category: "clothing" },
  { value: "dresses", label: "Dresses", category: "clothing" },
  { value: "tops", label: "Tops", category: "clothing" },
  { value: "swimwear", label: "Swimwear", category: "clothing" },
  { value: "other_clothing", label: "Other clothing", category: "clothing", isDefault: true },
  { value: "accessories", label: "Accessories", category: "extras" },
  { value: "photo_sets", label: "Photo sets", category: "extras" },
  { value: "video_clips", label: "Video clips", category: "extras" },
  { value: "feet_pics", label: "Feet pics", category: "extras" },
  { value: "experiences", label: "Experiences", category: "extras" },
  { value: "dick_ratings", label: "Dick ratings", category: "extras" },
  { value: "sex_toys", label: "Sex toys", category: "extras" },
  { value: "sexting", label: "Sexting", category: "extras" },
] as const satisfies readonly {
  value: string;
  label: string;
  category: Category;
  isDefault?: boolean;
}[];

export type Subcategory = (typeof SUBCATEGORIES)[number]["value"];

export const SUBCATEGORY_VALUES = SUBCATEGORIES.map((s) => s.value);

export function subcategoryInfo(value: string | undefined | null) {
  return SUBCATEGORIES.find((s) => s.value === value);
}

export function subcategoriesOf(category: Category) {
  return SUBCATEGORIES.filter((s) => s.category === category);
}
