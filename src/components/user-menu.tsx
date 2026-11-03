import Link from "next/link";
import { useQuery } from "@/lib/backend/react.tsx";
import { List, LogOut, Package, Settings, ShieldCheck, Sparkles, User } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import { settingsPathFor } from "@/lib/settings.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ProfileAvatar from "./profile-avatar.tsx";

/** Avatar button in the header that opens the account menu. */
export default function UserMenu() {
  const me = useQuery(api.users.menu, {});
  const { signout } = useAuth();

  if (me === undefined) return <Skeleton className="size-9 rounded-full" />;
  if (me === null) return null;

  const isSeller = me.accountType === "seller" || me.isAdmin;
  const links = [
    { to: "/shop", label: "My profile", icon: User, show: true },
    { to: "/my-listings", label: "My listings", icon: List, show: isSeller },
    { to: "/orders", label: "Orders", icon: Package, show: true },
    { to: "/customs", label: "Custom requests", icon: Sparkles, show: true },
    { to: settingsPathFor(me.accountType), label: "Settings", icon: Settings, show: true },
    { to: "/admin", label: "Admin", icon: ShieldCheck, show: me.isAdmin },
  ].filter((l) => l.show);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="cursor-pointer rounded-full outline-none ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-primary/60 focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ProfileAvatar name={me.name} url={me.avatarUrl} className="size-9 text-lg" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <ProfileAvatar name={me.name} url={me.avatarUrl} className="size-10 text-xl" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me.name}</p>
            {me.email && <p className="truncate text-xs font-normal text-muted-foreground">{me.email}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {links.map((l) => (
          <DropdownMenuItem key={l.to} asChild className="cursor-pointer">
            <Link href={l.to}>
              <l.icon /> {l.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          variant="destructive"
          onSelect={() => {
            void signout();
          }}
        >
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
