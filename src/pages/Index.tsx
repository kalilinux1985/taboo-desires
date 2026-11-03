import { Link } from "react-router-dom";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  usePaginatedQuery,
  useQuery,
} from "@/lib/backend/react.tsx";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgePercent,
  Crown,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ActivityFeed from "./home/_components/activity-feed.tsx";
import {
  ListingCard,
  ListingGrid,
  ListingGridSkeleton,
} from "@/components/listing-card.tsx";
import { CATEGORIES } from "@/lib/listings.ts";

const TICKER = [
  "0% commission",
  "Worn panties",
  "Lingerie",
  "Gym socks",
  "Custom requests",
  "Discreet shipping",
  "Verified sellers",
];

const PERKS = [
  {
    icon: BadgePercent,
    title: "Zero commission",
    body: "Sellers keep 100% of every sale. No cuts, no hidden fees, ever.",
  },
  {
    icon: ShieldCheck,
    title: "Private and discreet",
    body: "Shop under a pseudonym. Your real name and address stay yours.",
  },
  {
    icon: MessagesSquare,
    title: "Customs on request",
    body: "Message any seller to arrange custom wear time, scents, or extras.",
  },
];

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
});

function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Decorative background: layered glows in the brand's violet/rose tones */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute -top-1/4 right-[-10%] size-[70vmax] rounded-full bg-violet-600/35 blur-3xl" />
        <div className="absolute bottom-[-30%] right-[20%] size-[55vmax] rounded-full bg-rose-500/25 blur-3xl" />
        <div className="absolute top-1/4 right-[35%] size-[30vmax] rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:22px_22px]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center gap-6 px-4 py-16 md:py-24">
        <motion.p
          {...rise(0)}
          className="w-fit rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground"
        >
          18+ intimate apparel marketplace
        </motion.p>
        <motion.h1
          {...rise(0.1)}
          className="max-w-3xl font-display text-6xl leading-[0.95] text-balance sm:text-7xl md:text-8xl"
        >
          Indulge your <em className="text-violet-400">taboo</em> desires.
        </motion.h1>
        <motion.p
          {...rise(0.2)}
          className="max-w-xl text-lg text-muted-foreground"
        >
          Buy and sell worn panties, lingerie, socks and custom requests from
          real sellers. Discreet, private, and zero commission.
        </motion.p>
        <motion.div {...rise(0.3)} className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="cursor-pointer">
            <Link to="/browse">
              Browse listings <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="cursor-pointer"
          >
            <Link to="/sell">Start selling</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="overflow-hidden border-y bg-primary py-3 text-primary-foreground">
      <motion.div
        className="flex w-max gap-10 whitespace-nowrap font-display text-xl italic"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      >
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            {t}{" "}
            <span aria-hidden className="text-primary-foreground/50">
              /
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function CategoryStrip() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            to={`/browse?category=${c.value}`}
            className="group flex cursor-pointer items-center justify-between rounded-md border border-white/10 bg-card shadow-[inset_4px_4px_14px_-4px_var(--color-violet-800)] px-4 py-5 transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <span className="font-display text-xl">{c.label}</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-8">
      <h2 className="font-display text-5xl md:text-6xl">{title}</h2>
      <Link
        to={to}
        className="cursor-pointer text-sm font-semibold uppercase tracking-wider underline-offset-4 hover:underline"
      >
        View all
      </Link>
    </div>
  );
}

/** Hidden entirely when there are no live auctions, so the home page never shows an empty block. */
function EndingSoon() {
  const query = usePaginatedQuery(
    api.auctions.endingSoon,
    {},
    { initialNumItems: 4 },
  );
  if (query.status !== "LoadingFirstPage" && query.results.length === 0)
    return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <SectionHeading title="Ending soon" to="/auctions" />
      <ListingGrid
        query={{
          ...query,
          status: query.status === "CanLoadMore" ? "Exhausted" : query.status,
        }}
        emptyTitle="No live auctions"
        emptyDescription="Check back soon."
      />
    </section>
  );
}

/** Pro perk: newest listing from each Pro seller. Hidden when there are none. */
function FeaturedSellers() {
  const featured = useQuery(api.subscriptions.featured, {});
  if (featured !== undefined && featured.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              <Crown className="size-4" /> Pro sellers
            </p>
            <h2 className="font-display text-5xl md:text-6xl">Featured</h2>
          </div>
          <Link
            to="/pricing"
            className="cursor-pointer text-sm font-semibold uppercase tracking-wider underline-offset-4 hover:underline"
          >
            Get featured
          </Link>
        </div>
        {featured === undefined ? (
          <ListingGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FreshDrops() {
  const query = usePaginatedQuery(
    api.listings.browse,
    { sort: "newest" },
    { initialNumItems: 8 },
  );
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <SectionHeading title="New arrivals" to="/browse" />
      <ListingGrid
        query={{
          ...query,
          status: query.status === "CanLoadMore" ? "Exhausted" : query.status,
        }}
        emptyTitle="No listings yet"
        emptyDescription="Be the first seller to list something tempting."
        emptyAction={
          <Button asChild size="sm" className="cursor-pointer">
            <Link to="/sell">List an item</Link>
          </Button>
        }
      />
    </section>
  );
}

function Perks() {
  return (
    <section className="border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-3">
        {PERKS.map((p) => (
          <div key={p.title} className="flex flex-col gap-3">
            <div className="flex size-11 items-center justify-center rounded-md text-violet-500">
              <p.icon className="size-5" />
            </div>
            <h3 className="font-display text-3xl">{p.title}</h3>
            <p className="text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Index() {
  return (
    <>
      <AuthLoading>
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-11 w-40 rounded-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AuthLoading>
      {/* Signed-in members land on the community activity feed */}
      <Authenticated>
        <ActivityFeed />
      </Authenticated>
      <Unauthenticated>
        <Hero />
        <Ticker />
        <CategoryStrip />
        <FeaturedSellers />
        <EndingSoon />
        <FreshDrops />
        <Perks />
      </Unauthenticated>
    </>
  );
}
