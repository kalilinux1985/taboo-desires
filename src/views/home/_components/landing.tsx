"use client";

import Link from "next/link";
import {
  ArrowRight,
  Footprints,
  Heart,
  Images,
  MessageCircle,
  PackageCheck,
  PersonStanding,
  Search,
  ShieldCheck,
  Shirt,
  Star,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

const SERIF = "[font-family:var(--font-profile-buyer),Cambria,Georgia,serif]";
const SANS = "[font-family:Arial,Helvetica,sans-serif]";
const PAGE = "bg-[#17181c]";
const CARD = "rounded-[5px] border border-[#59595b40] bg-[#202227] py-0 shadow-[0_4px_14px_rgba(0,0,0,0.3)]";

type Step = { icon: LucideIcon; title: string; text: string };

const SELLER_STEPS: Step[] = [
  { icon: Images, title: "Create Listings", text: "Include details and pictures of the item you wish to sell. Then see the offers come rolling in." },
  { icon: MessageCircle, title: "Receive Orders", text: "Build your reputation to receive messages & orders from Buyers who want to purchase your items." },
  { icon: PackageCheck, title: "Ship & Review", text: "Send your item to the buyer, then leave a review." },
  { icon: Wallet, title: "Get Paid", text: "Get paid for your sale once your item is on its way." },
];

const BUYER_STEPS: Step[] = [
  { icon: Search, title: "Browse & Find", text: "Search the categories or filter by wear time, size and price to find the item you want." },
  { icon: MessageCircle, title: "Message Sellers", text: "Ask questions and agree on the details with the seller before you buy." },
  { icon: ShieldCheck, title: "Order With Confidence", text: "Check seller reviews and ID verification, then place your order." },
  { icon: Star, title: "Receive & Review", text: "Get your item, then leave a review to help other buyers." },
];

type Counts = { underwear: number; shoes: number; hosiery: number; clothing: number; instant: number };

const CATEGORY_CARDS: { key: keyof Counts; icon: LucideIcon; title: string; text: string; href: string }[] = [
  { key: "underwear", icon: Heart, title: "Used Underwear", text: "Find a wide selection of used panties, worn knickers, preloved thongs, and other lingerie for sale.", href: "/used/underwear" },
  { key: "shoes", icon: Footprints, title: "Used Shoes", text: "From high heels to boots and slippers, you'll find the perfect well-worn shoes here.", href: "/used/shoes" },
  { key: "hosiery", icon: PersonStanding, title: "Used Hosiery", text: "Choose from a large selection of smelly socks, worn pantyhose, stockings and tights.", href: "/used/hosiery" },
  { key: "clothing", icon: Shirt, title: "Used Clothing", text: "Everything from used t-shirts, dresses, skirts, pants, uniforms, gym gear, even face masks...", href: "/used/clothing" },
  { key: "instant", icon: Images, title: "Instant Content", text: "Access exclusive content right now! You'll find all kinds of custom pictures & videos here!", href: "/used/instant-content" },
];

function Heading({ children, dot }: { children: React.ReactNode; dot: string }) {
  return (
    <h2 className={cn(SANS, "text-[34px] font-bold leading-tight tracking-tight text-white sm:text-[44px]")}>
      {children}
      <span className="text-[#7c3aed]">{dot}</span>
    </h2>
  );
}

function StepCards({ steps }: { steps: Step[] }) {
  return (
    <div className="grid gap-[30px] sm:grid-cols-2">
      {steps.map((s, i) => (
        <Card key={s.title} data-slot="card" className={cn(CARD, "gap-0 p-[28px]")}>
          <div className="flex items-start justify-between">
            <span className={cn(SANS, "text-[44px] font-bold leading-none text-[#7c3aed]")}>{String(i + 1).padStart(2, "0")}</span>
            <span className="flex size-14 items-center justify-center rounded-full bg-[#7c3aed]/20">
              <s.icon className="size-6 text-[#7c3aed]" strokeWidth={1.75} />
            </span>
          </div>
          <h3 className={cn(SANS, "mt-3 text-[19px] font-bold text-white")}>{s.title}</h3>
          <p className={cn(SANS, "mt-2 text-[15px] leading-6 text-white")}>{s.text}</p>
        </Card>
      ))}
    </div>
  );
}

export default function Landing() {
  const counts = useQuery(api.listings.landingCounts, {}) as Counts | undefined;
  const sellers = useQuery(api.users.topSellers, {});

  return (
    <div className={cn(PAGE, "min-h-[calc(100dvh-3.5rem)] text-white")}>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1110px] items-center gap-10 px-5 pb-14 pt-8 lg:grid-cols-[1fr_400px]">
        <div>
          <img src="/logo.png" alt="Taboo Desires" className="size-[110px] rounded-[5px] object-cover" />
          <h1 className={cn(SERIF, "mt-6 text-[40px] leading-[1.15] text-white sm:text-[48px]")}>
            <span className="text-[#7c3aed]">Buy <span className="text-[0.55em]">&amp;</span> Sell</span> Used Panties, Worn Socks &amp; More<span className="text-[#7c3aed]">.</span>
          </h1>
          <p className={cn(SERIF, "mt-4 text-[17px] leading-[24px] text-white")}>
            Dive into a world where you can sell, swap, and snag your favorite treasures! Join the fun and connect with other savvy sellers and buyers.
          </p>
          <Button asChild className={cn(SERIF, "mt-8 h-[76px] w-full cursor-pointer rounded-[5px] bg-[#7c3aed] text-[28px] text-white hover:bg-[#7c3aed]")}>
            <Link href="/signin">Get Started</Link>
          </Button>
        </div>
        {/* Top sellers: just their pictures, each linking to their profile */}
        <div className="mx-auto grid w-full max-w-[400px] grid-cols-3 gap-[11px]">
          {Array.from({ length: 9 }).map((_, i) => {
            const s = sellers?.[i];
            return s ? (
              <Link
                key={s._id}
                href={`/${s.username}`}
                aria-label="View top seller's profile"
                className="block aspect-square cursor-pointer overflow-hidden rounded-[5px] bg-[#a8a9ae] transition-opacity hover:opacity-85"
              >
                <img src={s.avatarUrl!} alt="" loading="lazy" className="size-full object-cover" />
              </Link>
            ) : (
              <div key={`empty-${i}`} aria-hidden className="flex aspect-square items-end justify-center overflow-hidden rounded-[5px] bg-[#a8a9ae]">
                <UserRound className="size-[88%] translate-y-[8%] text-[#222226]" strokeWidth={1.1} fill="currentColor" />
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1110px] px-5 pb-16 pt-8">
        <div className="text-center">
          <Heading dot="?">How Taboo Desires Works</Heading>
          <p className={cn(SANS, "mt-2 text-[17px] text-white")}>Buying &amp; Selling worn items couldn&rsquo;t be easier</p>
        </div>
        <Tabs defaultValue="sellers" className="mt-8 gap-6">
          <TabsList className="grid h-[54px] w-full grid-cols-2 gap-[30px] rounded-[5px] bg-transparent p-0">
            {(["sellers", "buyers"] as const).map((v) => (
              <TabsTrigger
                key={v}
                value={v}
                className={cn(
                  SANS,
                  "h-[54px] cursor-pointer rounded-[5px] border-0 bg-[#202227] text-[16px] font-bold text-white shadow-none",
                  "data-[state=active]:bg-[#7c3aed] data-[state=active]:text-white",
                )}
              >
                {v === "sellers" ? "For Sellers" : "For Buyers"}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="sellers">
            <StepCards steps={SELLER_STEPS} />
            <div className="mt-6 text-center">
              <Button asChild className={cn(SANS, "h-[50px] cursor-pointer rounded-[5px] bg-[#7c3aed] px-12 text-[16px] font-bold text-white hover:bg-[#7c3aed]")}>
                <Link href="/sell">Start Selling Today</Link>
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="buyers">
            <StepCards steps={BUYER_STEPS} />
            <div className="mt-6 text-center">
              <Button asChild className={cn(SANS, "h-[50px] cursor-pointer rounded-[5px] bg-[#7c3aed] px-12 text-[16px] font-bold text-white hover:bg-[#7c3aed]")}>
                <Link href="/browse">Start Shopping Today</Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-[1110px] px-5 pb-20 pt-4">
        <div className="text-center">
          <Heading dot=".">Categories</Heading>
          <p className={cn(SANS, "mt-2 text-[17px] text-white")}>Find the perfect worn item for you</p>
        </div>
        <div className="mt-8 grid gap-[30px] sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_CARDS.map((c) => {
            const n = counts?.[c.key] ?? 0;
            return (
              <Card key={c.key} data-slot="card" className={cn(CARD, "items-center gap-0 px-6 pb-6 pt-7 text-center")}>
                <c.icon className="size-7 text-[#7c3aed]" strokeWidth={1.75} />
                <h3 className={cn(SANS, "mt-3 text-[19px] font-bold text-white")}>
                  {c.title}
                  {n > 0 && (
                    <span className="text-[16px] font-bold text-[#7c3aed]"> - {n.toLocaleString("en-US")} {n === 1 ? "item" : "items"}</span>
                  )}
                </h3>
                <p className={cn(SANS, "mb-5 mt-2 flex-1 text-[15px] leading-6 text-white")}>{c.text}</p>
                <Button asChild className={cn(SANS, "h-[56px] w-full cursor-pointer gap-2 rounded-[5px] bg-[#7c3aed] text-[18px] font-bold text-white hover:bg-[#7c3aed]")}>
                  <Link href={c.href}>
                    {c.title} <ArrowRight className="size-5" />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
