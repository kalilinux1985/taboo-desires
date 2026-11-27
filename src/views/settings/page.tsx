"use client";

import { useEffect } from "react";
import { useNavigate } from "@/lib/navigation.ts";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { settingsKindFor, settingsPathFor, type SettingsKind } from "@/lib/settings.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import ProfileForm from "@/components/profile-form.tsx";
import SellerSettingsForm from "./_components/seller-settings-form.tsx";
import BuyerDetailsForm from "./_components/buyer-details-form.tsx";
import ProfileVisibility from "./_components/profile-visibility.tsx";
import DeleteAccount from "./_components/delete-account.tsx";
import PushToggle from "@/components/push-toggle.tsx";

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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
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

  const isSeller = kind === "seller";
  // Shown until age, country and gender are chosen (the site sends new members here after sign-up)
  const setupBanner = me.missingBasics.length > 0 && (
    <div role="alert" className="rounded-[5px] border border-violet-600 bg-violet-600/15 p-4 text-sm text-white">
      <p className="font-semibold">Welcome! One more step before you start.</p>
      <p className="mt-1">
        Choose your <b>age</b>, <b>country</b> and <b>gender</b> below (marked <span className="text-red-500">*</span>), then save.
        You can use the rest of the site once they're set.
      </p>
    </div>
  );

  // Sellers: profile, More About You, Login Credentials, Notifications & Visibility, delete
  if (isSeller) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {setupBanner}
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
              <div className="flex flex-col gap-3 rounded-[5px] border border-destructive/40 bg-destructive/5 p-4">
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

  // Buyers: the same single column as sellers: profile, About you, visibility, delete
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {setupBanner}
      <Card>
        <CardHeader className="border-b border-white/[3%] pb-4">
          <CardTitle className="font-display text-2xl">Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">About you</CardTitle>
          <CardDescription>Optional. Shown on your buyer profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <BuyerDetailsForm initial={profile.buyerDetails} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <PushToggle />
        </CardContent>
      </Card>
      <ProfileVisibility initialPrivate={profile.isPrivate} />
      {!me.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Delete Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 rounded-[5px] border border-destructive/40 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-semibold text-destructive">Danger zone</p>
                <p className="text-xs text-muted-foreground">
                  Deleting your account permanently removes all of your content.
                </p>
              </div>
              <DeleteAccount />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** `/settings` redirects to the matching page; `/settings/seller` and `/settings/buyer` pass a kind. */
export default function SettingsPage({ kind }: { kind?: SettingsKind }) {
  return (
    <div className="profile-design settings-design mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <h1 className="[font-family:var(--font-nurma),Arial,sans-serif] text-4xl md:text-6xl">Settings</h1>
        <span className="h-1 w-16 rounded-full bg-violet-600" />
      </header>
      <RequireAuth message="Sign in to manage your settings.">
        <SettingsInner kind={kind} />
      </RequireAuth>
    </div>
  );
}
