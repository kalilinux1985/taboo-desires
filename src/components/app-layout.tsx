"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "@/lib/backend/react.tsx";
import { Heart, MessageCircle, Plus } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import AgeGate from "./age-gate.tsx";
import AccountTypeDialog from "./account-type-dialog.tsx";
import UserMenu from "./user-menu.tsx";
import MobileNav from "./mobile-nav.tsx";
import NotificationBell from "./notification-bell.tsx";
import { usePresenceHeartbeat } from "@/hooks/use-activity.ts";

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

function InboxLink() {
  const unread = useQuery(api.messages.unreadCount, {});
  return (
    <Button asChild size="sm" variant="ghost" className="relative cursor-pointer">
      <Link href="/messages" aria-label="Messages">
        <MessageCircle className="size-5 md:size-4" /> <span className="hidden lg:inline">Messages</span>
        {!!unread && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}

function SignedInActions() {
  usePresenceHeartbeat();
  const me = useQuery(api.users.menu, {});
  const isBuyer = me?.accountType === "buyer";
  // Phones show only Messages and the bell; the rest lives in the slide-out menu
  return (
    <div className="flex items-center gap-1 md:gap-2">
      {!isBuyer && (
        <Button asChild size="sm" className="hidden cursor-pointer md:inline-flex">
          <Link href="/sell">
            <Plus /> <span className="hidden lg:inline">Sell an item</span>
          </Link>
        </Button>
      )}
      <InboxLink />
      <NotificationBell />
      <Button asChild size="sm" variant="ghost" className="hidden cursor-pointer md:inline-flex">
        <Link href="/favorites" aria-label="Favorites">
          <Heart /> <span className="hidden lg:inline">Favorites</span>
        </Link>
      </Button>
      <div className="hidden pl-1 md:block">
        <UserMenu />
      </div>
    </div>
  );
}

/** Signed-out phones get the same two icons; both lead to sign in. */
function SignedOutActions() {
  return (
    <>
      <div className="flex items-center gap-1 md:hidden">
        <Button asChild size="icon" variant="ghost" className="cursor-pointer">
          <Link href="/signin?returnTo=%2Fmessages" aria-label="Messages">
            <MessageCircle className="size-5" />
          </Link>
        </Button>
        <NotificationBell href="/signin?returnTo=%2Fnotifications" />
      </div>
      <SignInButton size="sm" className="hidden md:inline-flex" />
    </>
  );
}

const NAV = [
  { to: "/browse", label: "Browse" },
  { to: "/following", label: "Following" },
  { to: "/auctions", label: "Auctions" },
  { to: "/pricing", label: "Go Pro" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "hidden text-sm font-medium uppercase tracking-wider md:inline",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-sidebar/95 text-sidebar-foreground backdrop-blur">
      {/* Phones: menu button left, name centered, Messages and bell right */}
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:flex md:justify-between md:gap-4">
        <div className="flex items-center gap-6">
          <MobileNav />
          <Logo className="hidden md:inline" />
          {NAV.map((n) => (
            <NavLink key={n.to} href={n.to} label={n.label} />
          ))}
        </div>
        <Logo className="text-center md:hidden" />
        <div className="flex justify-end">
          <AuthLoading>
            <Skeleton className="h-8 w-20 md:w-28" />
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
