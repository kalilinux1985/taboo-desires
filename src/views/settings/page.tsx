"use client";

import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@/lib/navigation.ts";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { settingsKindFor, settingsPathFor, type SettingsKind } from "@/lib/settings.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import ProfileForm from "@/components/profile-form.tsx";
import SellerSettingsForm from "./_components/seller-settings-form.tsx";
import BuyerDetailsForm from "./_components/buyer-details-form.tsx";
import DeleteAccount from "./_components/delete-account.tsx";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-sm font-medium">{value}</span>
    </div>
  );
}

function Redirect({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => navigate(to, { replace: true }), [navigate, to]);
  return null;
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
    return <Redirect to={settingsPathFor(me.accountType)} />;
  }

  const accountLabel = me.accountType === "seller" ? "Seller" : me.accountType === "buyer" ? "Buyer" : "Not chosen";
  const isSeller = kind === "seller";

  // Sellers: profile, More About You, Login Credentials, Notifications & Visibility, delete
  if (isSeller) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Card>
          <CardContent className="pt-6">
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>
        <SellerSettingsForm details={profile.sellerDetails} email={me.email ?? ""} />
        {!me.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">Delete Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 rounded-[1px] border border-destructive/40 bg-destructive/5 p-4">
                <p className="text-sm text-muted-foreground">
                  Permanently deleting your account will remove all your data on Taboo Desires,
                  including your listings, messages and posts. This can't be undone.
                </p>
                <DeleteAccount />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="border-b border-white/25 pb-4">
          <CardTitle className="font-display text-2xl">Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
      <Card className="lg:col-start-1">
        <CardHeader>
          <CardTitle className="font-display text-2xl">About you</CardTitle>
          <CardDescription>Optional. Shown on your buyer profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <BuyerDetailsForm initial={profile.buyerDetails} />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
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
            <div className="flex flex-col gap-3 rounded-[1px] border border-destructive/40 bg-destructive/5 p-4">
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">{eyebrow}</p>
        <h1 className="font-display text-4xl md:text-6xl">Settings</h1>
        <span className="h-1 w-16 rounded-full bg-violet-600" />
      </header>
      <RequireAuth message="Sign in to manage your settings.">
        <SettingsInner kind={kind} />
      </RequireAuth>
    </div>
  );
}
