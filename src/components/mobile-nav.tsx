"use client";

import { useEffect, useState, type ComponentType, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Gauge,
  LogIn,
  LogOut,
  Mail,
  Medal,
  Menu,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";
import { useBackendAuth, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { settingsPathFor } from "@/lib/settings.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import ProfileAvatar from "./profile-avatar.tsx";

type Icon = ComponentType<{ className?: string }>;

/** Shop sections, each opening to links into Browse with the matching filters. */
const SECTIONS: { label: string; links: { label: string; href: string }[] }[] = [
  {
    label: "Used Underwear",
    links: [
      { label: "Used Panties", href: "/browse?sub=panties" },
      { label: "Used Thongs", href: "/browse?sub=thongs" },
      { label: "Used Lingerie", href: "/browse?sub=lingerie" },
      { label: "Used Bras", href: "/browse?sub=bras" },
      { label: "All Used Underwear", href: "/browse?group=underwear" },
    ],
  },
  {
    label: "Used Shoes",
    links: [
      { label: "Used High Heels", href: "/browse?sub=high_heels" },
      { label: "Used Flat Shoes", href: "/browse?sub=flats" },
      { label: "Used Sneakers", href: "/browse?sub=sneakers" },
      { label: "Used Slippers", href: "/browse?sub=slippers" },
      { label: "Used Uniform Shoes", href: "/browse?sub=uniform_shoes" },
      { label: "Used Boots", href: "/browse?sub=boots" },
      { label: "All Used Shoes", href: "/browse?category=shoes" },
    ],
  },
  {
    label: "Used Hosiery",
    links: [
      { label: "Used Socks", href: "/browse?sub=socks" },
      { label: "Used Pantyhose", href: "/browse?sub=pantyhose" },
      { label: "Used Stockings", href: "/browse?sub=stockings" },
      { label: "Buy Feet Pics", href: "/browse?sub=feet_pics" },
      { label: "Sell Feet Pics", href: "/sell?category=extras&subcategory=feet_pics" },
      { label: "All Used Hosiery", href: "/browse?category=socks" },
    ],
  },
  {
    label: "Used Clothing",
    links: [
      { label: "Used Skirts", href: "/browse?sub=skirts" },
      { label: "Used Dresses", href: "/browse?sub=dresses" },
      { label: "Used Tops", href: "/browse?sub=tops" },
      { label: "Used Gym Clothes", href: "/browse?sub=gym_clothes" },
      { label: "Other Clothing", href: "/browse?sub=other_clothing" },
      { label: "Used Swimwear", href: "/browse?sub=swimwear" },
      { label: "All Used Clothing", href: "/browse?group=clothing" },
    ],
  },
  {
    label: "Naughty Extras",
    links: [
      { label: "Used Accessories", href: "/browse?sub=accessories" },
      { label: "Photo Sets", href: "/browse?sub=photo_sets" },
      { label: "Video Clips", href: "/browse?sub=video_clips" },
      { label: "Experiences", href: "/browse?sub=experiences" },
      { label: "Dick Ratings", href: "/browse?sub=dick_ratings" },
      { label: "Used Sex Toys", href: "/browse?sub=sex_toys" },
      { label: "Sexting", href: "/browse?sub=sexting" },
      { label: "All Naughty Extras", href: "/browse?category=extras" },
    ],
  },
  {
    label: "Instant Content",
    links: [
      { label: "Instant Pics", href: "/browse?instant=pics" },
      { label: "Instant Vids", href: "/browse?instant=vids" },
      { label: "All Instant Content", href: "/browse?instant=1" },
    ],
  },
  {
    label: "Used Mens",
    links: [
      { label: "All men's items", href: "/browse?sellers=men" },
      { label: "Men's underwear", href: "/browse?sellers=men&category=panties" },
      { label: "Men's socks", href: "/browse?sellers=men&category=socks" },
      { label: "Men's gym clothes", href: "/browse?sellers=men&category=activewear" },
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

function NavLink({
  href,
  icon: IconComponent,
  label,
  badge,
  onNavigate,
}: {
  href: string;
  icon: Icon;
  label: string;
  badge?: number;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-lg transition-colors hover:bg-white/5",
        active && "bg-primary/20 text-accent-foreground",
      )}
    >
      <IconComponent className="size-5 shrink-0 text-violet-400" />
      <span className="flex-1">{label}</span>
      {!!badge && (
        <span className="rounded-full bg-destructive px-2 text-xs font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function ShopSection({
  section,
  onNavigate,
}: {
  section: (typeof SECTIONS)[number];
  onNavigate: () => void;
}) {
  return (
    <Collapsible className="group/section">
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-lg transition-colors hover:bg-white/5">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
        <span>{section.label}</span>
        <ChevronDown className="size-4 shrink-0 text-violet-400 transition-transform group-data-[state=open]/section:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        <ul className="mx-1 mb-2 mt-1 rounded-xl bg-background py-1.5">
          {section.links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={onNavigate}
                className="mx-1.5 block rounded-lg px-4 py-2.5 text-base transition-colors hover:bg-white/5"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AccountHeader({ onNavigate }: { onNavigate: () => void }) {
  const { isLoading, isAuthenticated } = useBackendAuth();
  const me = useQuery(api.users.menu, isAuthenticated ? {} : "skip");
  if (isLoading || (isAuthenticated && me === undefined)) {
    return <div className="mx-auto size-20 animate-pulse rounded-full bg-white/10" />;
  }
  if (!me) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-2xl italic">
          Taboo <span className="text-violet-400">Desires</span>
        </p>
        <Button asChild className="cursor-pointer">
          <Link href="/signin" onClick={onNavigate}>
            <LogIn /> Sign in or join
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <Link
      href="/shop"
      onClick={onNavigate}
      className="flex flex-col items-center gap-3"
    >
      <ProfileAvatar
        name={me.name}
        url={me.avatarUrl}
        className="size-20 bg-white text-4xl text-primary"
      />
      <span className="max-w-full truncate text-lg font-bold">{me.name}</span>
    </Link>
  );
}

function AccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const me = useQuery(api.users.menu, {});
  const unread = useQuery(api.messages.unreadCount, {});
  if (!me) return null;
  const isSeller = me.accountType === "seller" || me.isAdmin;
  return (
    <nav className="flex flex-col gap-0.5 px-3 py-3">
      <NavLink href="/" icon={Gauge} label="Dashboard / Feed" onNavigate={onNavigate} />
      <NavLink
        href={isSeller ? "/my-listings" : "/browse"}
        icon={ShoppingBag}
        label="Listings"
        onNavigate={onNavigate}
      />
      <NavLink
        href="/messages"
        icon={Mail}
        label="Messages"
        badge={unread ?? undefined}
        onNavigate={onNavigate}
      />
      <NavLink href="/orders" icon={ShoppingCart} label="Orders" onNavigate={onNavigate} />
      <div className="h-6" />
      <NavLink
        href={settingsPathFor(me.accountType)}
        icon={Settings}
        label="Settings"
        onNavigate={onNavigate}
      />
    </nav>
  );
}

function PremiumBanner({ onNavigate }: { onNavigate: () => void }) {
  const { isAuthenticated } = useBackendAuth();
  const me = useQuery(api.users.menu, isAuthenticated ? {} : "skip");
  if (me?.isPro) {
    return (
      <p className="flex items-center justify-center gap-2 py-3.5 text-sm font-extrabold uppercase tracking-[0.18em] text-violet-400">
        <Medal className="size-5 text-rose-400" /> Pro member
      </p>
    );
  }
  return (
    <Link
      href="/pricing"
      onClick={onNavigate}
      className="group flex items-center justify-center gap-2 py-3.5 text-lg font-extrabold uppercase tracking-[0.18em] transition-colors hover:bg-primary/20"
    >
      <Medal className="size-6 text-rose-400" />
      Go Premium
      <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function SearchBox({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
    onNavigate();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 px-6 py-4" role="search">
      <label htmlFor="mobile-search" className="text-sm font-extrabold uppercase tracking-wider">
        Search
      </label>
      <div className="flex">
        <Input
          id="mobile-search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search members / listings"
          className="h-11 rounded-r-none border-r-0 bg-background"
        />
        <Button
          type="submit"
          aria-label="Search"
          className="h-11 cursor-pointer rounded-l-none bg-rose-500 px-4 text-white hover:bg-rose-400"
        >
          <Search className="size-5" />
        </Button>
      </div>
    </form>
  );
}

/**
 * Hamburger button (phones only) that slides the site menu in from the left:
 * account, premium upsell, main links, shop sections, search and sign out.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useBackendAuth();
  const { signout } = useAuth();
  const close = () => setOpen(false);

  // Close when the page changes some other way (back button, redirect)
  useEffect(() => setOpen(false), [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="-ml-2 cursor-pointer md:hidden"
        >
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex w-[88vw] max-w-sm flex-col gap-0 overflow-y-auto border-white/10 bg-card p-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      >
        <SheetTitle className="sr-only">Site menu</SheetTitle>
        <SheetDescription className="sr-only">
          Your account, shop sections and search
        </SheetDescription>

        <div className="flex items-center justify-between px-3 pt-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Go back"
            className="cursor-pointer"
            onClick={() => {
              close();
              router.back();
            }}
          >
            <ArrowLeft className="size-6" />
          </Button>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close menu" className="cursor-pointer">
              <X className="size-6" />
            </Button>
          </SheetClose>
        </div>
        <div className="px-6 pb-6">
          <AccountHeader onNavigate={close} />
        </div>

        <Separator className="bg-white/10" />
        <PremiumBanner onNavigate={close} />
        <Separator className="bg-white/10" />

        {isAuthenticated && <AccountLinks onNavigate={close} />}

        <div className="flex-1" />
        <Separator className="bg-white/10" />
        <nav aria-label="Shop" className="flex flex-col gap-0.5 px-3 py-3">
          {SECTIONS.map((s) => (
            <ShopSection key={s.label} section={s} onNavigate={close} />
          ))}
        </nav>

        <Separator className="bg-white/10" />
        <SearchBox onNavigate={close} />
        <Separator className="bg-white/10" />

        <div className="px-6 py-5">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                close();
                void signout();
              }}
              className="flex cursor-pointer items-center gap-2 font-display text-2xl italic text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-5" /> Logout
            </button>
          ) : (
            <Link
              href="/signin"
              onClick={close}
              className="flex items-center gap-2 font-display text-2xl italic text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogIn className="size-5" /> Sign in
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
