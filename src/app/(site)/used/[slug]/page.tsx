import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopCategoryPage from "@/views/used/page.tsx";
import { findShopPage, SHOP_PAGES } from "@/lib/shop-pages.ts";

type Props = { params: Promise<{ slug: string }> };

/** Every shop page is known ahead of time, so each is built once. */
export function generateStaticParams() {
  return SHOP_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findShopPage((await params).slug);
  return page ? { title: page.title } : {};
}

export default async function Page({ params }: Props) {
  const page = findShopPage((await params).slug);
  if (!page) notFound();
  return <ShopCategoryPage page={page} />;
}
