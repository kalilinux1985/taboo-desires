"use client";

import CoinIcon from "@/components/coin-icon.tsx";
import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Accessibility,
  Ban,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  LogIn,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  PhoneCall,
  Save,
  SquareX,
  UserCog,
  UserSearch } from "lucide-react";
import { useBackendAuth, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { settingsPathFor } from "@/lib/settings.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
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
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-[5px] px-3 py-1.5 text-lg text-white transition-colors hover:bg-[#151518]",
        active && "bg-[#1f1336]",
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
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-3 py-1.5 text-left text-base text-white transition-colors hover:bg-[#151518]">
        <ChevronRight className="size-4 shrink-0 text-violet-600 transition-transform group-data-[state=open]/section:rotate-90" />
        <span>{section.label}</span>
        <ChevronDown className="size-4 shrink-0 text-violet-600 transition-transform group-data-[state=open]/section:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        <ul className="mx-1 mb-2 mt-1 rounded-[5px] bg-background py-1.5">
          {section.links.map((l) => {
            const href = "page" in l ? shopPageHref(l.page) : l.href;
            return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className="mx-1.5 block rounded-[5px] px-4 py-2.5 text-base transition-colors hover:bg-[#151518]"
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
    return <div className="mx-auto size-[52px] animate-pulse rounded-[3px] bg-[#1f1f22]" />;
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
      className="flex flex-col items-center gap-2"
    >
      <ProfileAvatar
        name={me.name}
        url={me.avatarUrl}
        className="size-[52px] rounded-[3px] bg-white text-2xl text-primary"
      />
      <span className="max-w-full truncate text-lg font-bold text-white">{me.name}</span>
    </Link>
  );
}

function AccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const me = useQuery(api.users.menu, {});
  const unread = useQuery(api.messages.unreadCount, {});
  if (!me) return null;
  return (
    <nav aria-label="Account" className="flex flex-col gap-0.5 px-3 py-3">
      <NavLink href="/" icon={Layers} label="Dashboard/Feed" onNavigate={onNavigate} />
      <NavLink
        href="/messages"
        icon={MessageSquareText}
        label="Messages"
        badge={unread ?? undefined}
        onNavigate={onNavigate}
      />
      <NavLink href="/orders" icon={Package} label="Orders" onNavigate={onNavigate} />
      <NavLink href="/coins" icon={CoinIcon} label="Taboo Coins" onNavigate={onNavigate} />
      <NavLink
        href={settingsPathFor(me.accountType)}
        icon={UserCog}
        label="Settings"
        onNavigate={onNavigate}
      />
      <NavLink href="/favorites" icon={Save} label="Saved for later" onNavigate={onNavigate} />
    </nav>
  );
}

function FindLinks({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav aria-label="Find members" className="flex flex-col gap-0.5 px-3 py-3">
      <NavLink href="/find-sellers" icon={UserSearch} label="Find Sellers" onNavigate={onNavigate} />
      <NavLink href="/find-buyers" icon={Accessibility} label="Find Buyers" onNavigate={onNavigate} />
    </nav>
  );
}

function SupportLinks({ onNavigate }: { onNavigate: () => void }) {
  const { isAuthenticated } = useBackendAuth();
  return (
    <nav aria-label="Help" className="flex flex-col gap-0.5 px-3 py-3">
      {isAuthenticated && (
        <NavLink href="/blocked" icon={Ban} label="Blocked Users" onNavigate={onNavigate} />
      )}
      <NavLink href="/report" icon={PhoneCall} label="Contact / Support" onNavigate={onNavigate} />
    </nav>
  );
}

function PremiumBanner({ onNavigate }: { onNavigate: () => void }) {
  const { isAuthenticated } = useBackendAuth();
  const me = useQuery(api.users.menu, isAuthenticated ? {} : "skip");
  if (me?.isPro) {
    return (
      <p className="flex items-center justify-center gap-2 py-2.5 text-base font-extrabold uppercase tracking-[0.04em] text-violet-600">
        <BadgeCheck className="size-5" /> Pro member
      </p>
    );
  }
  return (
    <Link
      href="/pricing"
      onClick={onNavigate}
      className="group flex items-center justify-center gap-2 py-2.5 text-base font-extrabold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#1f1336]"
    >
      <BadgeCheck className="size-5 text-violet-600" />
      Go Premium
      <ChevronRight className="size-5 text-violet-600 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/**
 * Hamburger button (phones only) that fades and slides the site menu in from the left:
 * account, premium upsell, main links, member search, shop sections, help and sign out.
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
          className="-ml-2 cursor-pointer text-violet-600 hover:text-violet-600 md:hidden"
        >
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex w-[88vw] max-w-sm flex-col gap-0 overflow-y-auto border-[#141417] bg-[#09090b] p-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
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
            className="cursor-pointer text-violet-600 hover:text-violet-600"
            onClick={() => {
              close();
              router.back();
            }}
          >
            <ChevronLeft className="size-7" />
          </Button>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close menu" className="cursor-pointer text-violet-600 hover:text-violet-600">
              <SquareX className="size-5" />
            </Button>
          </SheetClose>
        </div>
        <div className="px-6 pb-4">
          <AccountHeader onNavigate={close} />
        </div>

        <Separator className="bg-[#474749]" />
        <PremiumBanner onNavigate={close} />
        <Separator className="bg-[#474749]" />

        {isAuthenticated && (
          <>
            <AccountLinks onNavigate={close} />
            <Separator className="bg-[#474749]" />
          </>
        )}
        <FindLinks onNavigate={close} />
        <Separator className="bg-[#474749]" />
        <nav aria-label="Shop" className="flex flex-col gap-0.5 px-3 py-3">
          {SHOP_SECTIONS.map((s) => (
            <ShopSection key={s.label} section={s} onNavigate={close} />
          ))}
        </nav>
        <Separator className="bg-[#474749]" />
        <SupportLinks onNavigate={close} />
        <Separator className="bg-[#474749]" />

        <div className="px-4 py-4">
          {isAuthenticated ? (
            <Button variant="plain" size="none"
              type="button"
              onClick={() => {
                close();
                void signout();
              }}
              className="flex cursor-pointer items-center gap-3 text-lg font-semibold uppercase text-white transition-colors hover:text-violet-600"
            >
              <LogOut className="size-5 text-red-500" /> Logout
            </Button>
          ) : (
            <Link
              href="/signin"
              onClick={close}
              className="flex items-center gap-3 text-lg font-semibold uppercase text-white transition-colors hover:text-violet-600"
            >
              <LogIn className="size-5 text-violet-600" /> Sign in
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
