// The shop's menu sections and the page behind each link (/used/<slug>).
// Each page shows only active listings matching its filter.

import type { BrowseArgs } from "@/components/shop/shop-grid.tsx";
import { SUBCATEGORIES, type Subcategory } from "@/shared/subcategories.ts";

type Filter = Omit<BrowseArgs, "sort">;

export type ShopPage = {
  slug: string;
  /** Banner, e.g. "Buy Used High Heels" */
  title: string;
  /** Highlighted word in "Shop for …" */
  shopFor: string;
  filter: Filter;
  /** Hide the Category filter when the page is already one category or type */
  fixedCategory: boolean;
};

export type MenuLink = { label: string } & ({ page: ShopPage } | { href: string });

const MEN = [{ key: "gender", values: ["Male", "Trans man"] }];

function page(slug: string, label: string, filter: Filter, fixedCategory = true): MenuLink {
  return {
    label,
    page: {
      slug,
      title: `Buy ${label}`,
      shopFor: label.replace(/^(All )?(Used )?/, ""),
      filter,
      fixedCategory,
    },
  };
}

/** One page per listing type: slug from its label ("Flat shoes" -> flat-shoes). */
function sub(value: Subcategory, label: string): MenuLink {
  const info = SUBCATEGORIES.find((s) => s.value === value)!;
  return page(info.label.toLowerCase().replace(/\s+/g, "-"), label, { subcategory: value });
}

export const SHOP_SECTIONS: { label: string; links: MenuLink[] }[] = [
  {
    label: "Used Underwear",
    links: [
      sub("panties", "Used Panties"),
      sub("thongs", "Used Thongs"),
      sub("lingerie", "Used Lingerie"),
      sub("bras", "Used Bras"),
      page("underwear", "All Used Underwear", { categories: ["panties", "bras", "lingerie"] }, false),
    ],
  },
  {
    label: "Used Shoes",
    links: [
      sub("high_heels", "Used High Heels"),
      sub("flats", "Used Flat Shoes"),
      sub("sneakers", "Used Sneakers"),
      sub("slippers", "Used Slippers"),
      sub("uniform_shoes", "Used Uniform Shoes"),
      sub("boots", "Used Boots"),
      page("shoes", "All Used Shoes", { category: "shoes" }),
    ],
  },
  {
    label: "Used Hosiery",
    links: [
      sub("socks", "Used Socks"),
      sub("pantyhose", "Used Pantyhose"),
      sub("stockings", "Used Stockings"),
      { ...sub("feet_pics", "Feet Pics"), label: "Buy Feet Pics" },
      { label: "Sell Feet Pics", href: "/sell?category=extras&subcategory=feet_pics" },
      page("hosiery", "All Used Hosiery", { category: "socks" }),
    ],
  },
  {
    label: "Used Clothing",
    links: [
      sub("skirts", "Used Skirts"),
      sub("dresses", "Used Dresses"),
      sub("tops", "Used Tops"),
      sub("gym_clothes", "Used Gym Clothes"),
      sub("other_clothing", "Other Clothing"),
      sub("swimwear", "Used Swimwear"),
      page("clothing", "All Used Clothing", { categories: ["clothing", "activewear"] }, false),
    ],
  },
  {
    label: "Naughty Extras",
    links: [
      sub("accessories", "Used Accessories"),
      sub("photo_sets", "Photo Sets"),
      sub("video_clips", "Video Clips"),
      sub("experiences", "Experiences"),
      sub("dick_ratings", "Dick Ratings"),
      sub("sex_toys", "Used Sex Toys"),
      sub("sexting", "Sexting"),
      page("naughty-extras", "All Naughty Extras", { category: "extras" }),
    ],
  },
  {
    label: "Instant Content",
    links: [
      page("instant-pics", "Instant Pics", { lockedOnly: true, lockedMedia: "image" }, false),
      page("instant-vids", "Instant Vids", { lockedOnly: true, lockedMedia: "video" }, false),
      page("instant-content", "All Instant Content", { lockedOnly: true }, false),
    ],
  },
  {
    label: "Used Mens",
    links: [
      page("mens-underwear", "Men's Used Underwear", { seller: MEN, categories: ["panties", "lingerie"] }, false),
      page("mens-socks", "Men's Used Socks", { seller: MEN, category: "socks" }),
      page("mens-gym-clothes", "Men's Used Gym Clothes", { seller: MEN, category: "activewear" }),
      page("mens", "All Used Mens", { seller: MEN }, false),
    ],
  },
  {
    label: "Sell Used Clothing",
    links: [
      { label: "List an item", href: "/sell" },
      { label: "My shop", href: "/shop" },
      { label: "Seller plans", href: "/pricing" },
    ],
  },
];

export const SHOP_PAGES: ShopPage[] = SHOP_SECTIONS.flatMap((s) =>
  s.links.flatMap((l) => ("page" in l ? [l.page] : [])),
);

export function findShopPage(slug: string): ShopPage | undefined {
  return SHOP_PAGES.find((p) => p.slug === slug);
}

export const shopPageHref = (p: ShopPage) => `/used/${p.slug}`;

