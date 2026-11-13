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
import { SHOP_SECTIONS, shopPageHref } from "@/lib/shop-pages.ts";

type Icon = ComponentType<{ className?: string }>;

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
        "flex items-center gap-3 rounded-[1px] px-3 py-2.5 text-lg transition-colors hover:bg-white/5",
        active && "bg-primary/20 text-accent-foreground",
      )}
    >
      <IconComponent className="size-5 shrink-0 text-violet-600" />
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
  section: (typeof SHOP_SECTIONS)[number];
  onNavigate: () => void;
}) {
  return (
    <Collapsible className="group/section">
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-[1px] px-3 py-2 text-left text-lg transition-colors hover:bg-white/5">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
        <span>{section.label}</span>
        <ChevronDown className="size-4 shrink-0 text-violet-600 transition-transform group-data-[state=open]/section:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        <ul className="mx-1 mb-2 mt-1 rounded-[1px] bg-background py-1.5">
          {section.links.map((l) => {
            const href = "page" in l ? shopPageHref(l.page) : l.href;
            return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className="mx-1.5 block rounded-[1px] px-4 py-2.5 text-base transition-colors hover:bg-white/5"
              >
                {l.label}
              </Link>
            </li>
            );
          })}
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
          Taboo <span className="text-violet-600">Desires</span>
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
      <p className="flex items-center justify-center gap-2 py-3.5 text-sm font-extrabold uppercase tracking-[0.18em] text-violet-600">
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
 * Hamburger button (phones only) that fades and slides the site menu in from the left:
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
          className="-ml-2 cursor-pointer text-violet-600 hover:text-white md:hidden"
        >
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex w-[88vw] max-w-sm flex-col gap-0 overflow-y-auto border-white/25 bg-[#0a0f22]/98 p-0 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
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

        <Separator className="bg-white/25" />
        <PremiumBanner onNavigate={close} />
        <Separator className="bg-white/25" />

        {isAuthenticated && <AccountLinks onNavigate={close} />}

        <div className="flex-1" />
        <Separator className="bg-white/25" />
        <nav aria-label="Shop" className="flex flex-col gap-0.5 px-3 py-3">
          {SHOP_SECTIONS.map((s) => (
            <ShopSection key={s.label} section={s} onNavigate={close} />
          ))}
        </nav>

        <Separator className="bg-white/25" />
        <SearchBox onNavigate={close} />
        <Separator className="bg-white/25" />

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
