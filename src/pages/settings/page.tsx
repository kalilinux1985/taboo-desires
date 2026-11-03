import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { settingsKindFor, settingsPathFor, type SettingsKind } from "@/lib/settings.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import ProfileForm from "@/components/profile-form.tsx";
import SellerDetailsForm from "./_components/seller-details-form.tsx";
import BuyerDetailsForm from "./_components/buyer-details-form.tsx";
import DeleteAccount from "./_components/delete-account.tsx";
import PlanCard from "./_components/plan-card.tsx";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-sm font-medium">{value}</span>
    </div>
  );
}

function SettingsInner({ kind }: { kind?: SettingsKind }) {
  const me = useQuery(api.users.menu, {});
  const profile = useQuery(api.users.getProfile, me ? { userId: me._id } : "skip");
  if (me === undefined || (me && profile === undefined)) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!me || !profile) return null;
  // Send members to the settings page that matches their account type
  if (kind !== settingsKindFor(me.accountType)) {
    return <Navigate to={settingsPathFor(me.accountType)} replace />;
  }

  const accountLabel = me.accountType === "seller" ? "Seller" : me.accountType === "buyer" ? "Buyer" : "Not chosen";
  const isSeller = kind === "seller";
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        {isSeller ? (
          <CardHeader>
            <CardTitle className="font-display text-2xl">Profile</CardTitle>
            <CardDescription>This is what other members see.</CardDescription>
          </CardHeader>
        ) : (
          <CardHeader className="border-b border-white/10 pb-4">
            <CardTitle className="font-display text-2xl">Profile Information</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <ProfileForm profile={profile} layout={isSeller ? "seller" : "buyer"} />
        </CardContent>
      </Card>
      {isSeller ? (
        <Card className="lg:col-start-1">
          <CardHeader>
            <CardTitle className="font-display text-2xl">More about you</CardTitle>
            <CardDescription>
              Optional. Shown on your shop so buyers can find you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SellerDetailsForm initial={profile.sellerDetails} />
          </CardContent>
        </Card>
      ) : (
        <Card className="lg:col-start-1">
          <CardHeader>
            <CardTitle className="font-display text-2xl">About you</CardTitle>
            <CardDescription>Optional. Shown on your buyer profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <BuyerDetailsForm initial={profile.buyerDetails} />
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
      {isSeller && <PlanCard />}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Row label="Email" value={me.email ?? "None"} />
            <Row label="Account type" value={accountLabel} />
          </div>
          <SignInButton size="sm" variant="secondary" signOutText="Log out" />
          {!me.isAdmin && (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-semibold text-destructive">Danger zone</p>
                <p className="text-xs text-muted-foreground">
                  Deleting your account permanently removes all of your content.
                </p>
              </div>
              <DeleteAccount />
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

/** `/settings` redirects to the matching page; `/settings/seller` and `/settings/buyer` pass a kind. */
export default function SettingsPage({ kind }: { kind?: SettingsKind }) {
  const eyebrow = kind === "buyer" ? "Buyer account" : kind === "seller" ? "Seller account" : "Your account";
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">{eyebrow}</p>
        <h1 className="font-display text-4xl md:text-6xl">Settings</h1>
        <span className="h-1 w-16 rounded-full bg-violet-500" />
      </header>
      <RequireAuth message="Sign in to manage your settings.">
        <SettingsInner kind={kind} />
      </RequireAuth>
    </div>
  );
}
