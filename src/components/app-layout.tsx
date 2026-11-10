"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "@/lib/backend/react.tsx";
import { ChevronDown, MessageSquareText, Search, UserRound } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import AgeGate from "./age-gate.tsx";
import AccountTypeDialog from "./account-type-dialog.tsx";
import UserMenu from "./user-menu.tsx";
import MobileNav from "./mobile-nav.tsx";
import NotificationBell from "./notification-bell.tsx";
import { usePresenceHeartbeat } from "@/hooks/use-activity.ts";
import { SHOP_SECTIONS, shopPageHref } from "@/lib/shop-pages.ts";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("font-display text-2xl italic leading-none", className)}
    >
      Taboo <span className="text-violet-600">Desires</span>
    </Link>
  );
}

// Top bar of the design: round logo, search box, five shop dropdowns, then
// square Messages / Notifications / account buttons. Tablets and up get the
// full bar; phones get the menu button, the logo and the two icon buttons.

/** Square dark button used for the header icons. */
export const HEADER_ICON_BUTTON =
  "relative flex size-[41px] shrink-0 cursor-pointer items-center justify-center rounded-[3px] bg-slate-900 text-violet-600 transition-colors hover:bg-slate-800 hover:text-violet-500";

const COUNT_BADGE =
  "absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-sans text-[10px] font-bold text-white";

/** Round logo mark (links home). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Taboo Desires home"
      className={cn(
        "flex size-[42px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-violet-700 to-purple-900 font-display text-lg italic leading-none text-violet-100 shadow-[0_0_0_1px_rgba(167,139,250,0.25)]",
        className,
      )}
    >
      TD
    </Link>
  );
}

function InboxLink() {
  const unread = useQuery(api.messages.unreadCount, {});
  return (
    <Link href="/messages" aria-label="Messages" className={HEADER_ICON_BUTTON}>
      <MessageSquareText className="size-5" strokeWidth={1.75} />
      {!!unread && <span className={COUNT_BADGE}>{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}

function SignedInActions() {
  usePresenceHeartbeat();
  return (
    <div className="flex items-center gap-2">
      <InboxLink />
      <NotificationBell className={HEADER_ICON_BUTTON} />
      <div className="hidden md:block">
        <UserMenu />
      </div>
    </div>
  );
}

/** Signed out: the same buttons, all leading to sign in. */
function SignedOutActions() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/signin?returnTo=%2Fmessages" aria-label="Messages" className={HEADER_ICON_BUTTON}>
        <MessageSquareText className="size-5" strokeWidth={1.75} />
      </Link>
      <NotificationBell href="/signin?returnTo=%2Fnotifications" className={HEADER_ICON_BUTTON} />
      <Link href="/signin" aria-label="Sign in" className={cn(HEADER_ICON_BUTTON, "hidden md:flex")}>
        <UserRound className="size-5" strokeWidth={1.75} />
      </Link>
    </div>
  );
}

/** The five shop dropdowns: label in the bar, with its short form for tablets. */
const MENUS = [
  { label: "Used Underwear", short: "Underwear", section: "Used Underwear" },
  { label: "Used Shoes", short: "Shoes", section: "Used Shoes" },
  { label: "Used Hosiery", short: "Hosiery", section: "Used Hosiery" },
  { label: "Used Clothing", short: "Clothing", section: "Used Clothing" },
  { label: "Used Extras", short: "Extras", section: "Naughty Extras" },
] as const;

function ShopMenu({ label, short, section }: (typeof MENUS)[number]) {
  const links = SHOP_SECTIONS.find((s) => s.label === section)?.links ?? [];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1 whitespace-nowrap font-serif text-[13px] uppercase text-slate-300 outline-none transition-colors hover:text-white focus-visible:text-white data-[state=open]:text-white xl:text-[15px]">
        <span className="xl:hidden">{short}</span>
        <span className="hidden xl:inline">{label}</span>
        <ChevronDown className="size-3.5 text-slate-300" strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={14}
        className="min-w-56 rounded-[3px] border-[#383b3d]/90 bg-gray-950/98 font-serif"
      >
        {links.map((l) => {
          const href = "page" in l ? shopPageHref(l.page) : l.href;
          return (
            <DropdownMenuItem key={href} asChild className="cursor-pointer text-[13px] text-slate-300 transition-colors hover:bg-transparent hover:text-violet-600 focus:bg-transparent focus:text-violet-600">
              <Link href={href}>{l.label}</Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Search box: a field on large screens, an icon that opens one on tablets. */
function HeaderSearch() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
    setOpen(false);
  };
  const field = (autoFocus: boolean) => (
    <form onSubmit={submit} role="search" className="flex h-[41px] w-full items-center gap-2.5 rounded-[3px] bg-slate-700 px-3">
      <Search className="size-5 shrink-0 text-slate-400" strokeWidth={1.5} />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={autoFocus}
        aria-label="Search users and listings"
        placeholder="Search Users / Listings..."
        className="min-w-0 flex-1 bg-transparent font-serif text-[13px] text-slate-200 outline-none placeholder:text-slate-400 xl:text-[14px]"
      />
    </form>
  );
  return (
    <>
      <div className="hidden w-[229px] shrink-0 xl:block">{field(false)}</div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger aria-label="Search" className={cn(HEADER_ICON_BUTTON, "xl:hidden")}>
          <Search className="size-5" strokeWidth={1.75} />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={10} className="w-72 rounded-[3px] border-[#383b3d]/90 bg-gray-950/98 p-2">
          {field(true)}
        </PopoverContent>
      </Popover>
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-gray-950/98 backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-[1205px] items-center justify-between gap-4 px-4 xl:px-0">
        {/* Phones: menu button and logo on the left */}
        <div className="flex items-center gap-3 md:gap-[19px]">
          <MobileNav />
          <LogoMark />
          <div className="hidden md:block">
            <HeaderSearch />
          </div>
        </div>
        <nav aria-label="Shop" className="hidden flex-1 items-center justify-center gap-5 md:flex lg:gap-7 xl:justify-start xl:gap-[34px] xl:pl-3">
          {MENUS.map((m) => (
            <ShopMenu key={m.label} {...m} />
          ))}
        </nav>
        <div className="flex justify-end">
          <AuthLoading>
            <Skeleton className="h-[41px] w-[90px] md:w-[139px]" />
          </AuthLoading>
          <Unauthenticated>
            <SignedOutActions />
          </Unauthenticated>
          <Authenticated>
            <SignedInActions />
          </Authenticated>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo className="text-xl" />
        <p className="text-sm text-muted-foreground">
          18+ only. 0% commission. &copy; {new Date().getFullYear()} Taboo Desires
        </p>
      </div>
    </footer>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AgeGate>
        <AccountTypeDialog />
      </AgeGate>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
