"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useNavigate, useSearchParams } from "@/lib/navigation.ts";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { supabase } from "@/lib/backend/client.ts";
import { useAuth } from "@/components/providers/auth.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { callbackUrl, resolveReturnTo } from "./return-to.ts";

type Mode = "signin" | "signup" | "link";

const MIN_PASSWORD = 8;

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.ComponentProps<"input">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}

/** Email + password sign-in, account creation, and passwordless email links (Supabase Auth). */
export default function SignInPage() {
  const [params] = useSearchParams();
  const returnTo = resolveReturnTo(params.get("returnTo"));
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(returnTo, { replace: true });
  }, [isLoading, isAuthenticated, navigate, returnTo]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const signIn = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigate(returnTo, { replace: true });
    });
  };

  const signUp = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      toast.error(`Use at least ${MIN_PASSWORD} characters for your password`);
      return;
    }
    void run(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl(returnTo),
          data: name.trim() ? { name: name.trim() } : undefined,
        },
      });
      if (error) throw error;
      if (data.session) navigate(returnTo, { replace: true });
      else setSentTo(email.trim());
    });
  };

  const sendLink = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl(returnTo) },
      });
      if (error) throw error;
      setSentTo(email.trim());
    });
  };

  const resetPassword = () => {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    void run(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: new URL("/auth/reset", window.location.origin).toString(),
        },
      );
      if (error) throw error;
      toast.success("Check your email for a link to choose a new password");
    });
  };

  if (sentTo) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Mail className="size-6" />
        </div>
        <h1 className="font-display text-3xl">Check your email</h1>
        <p className="text-muted-foreground">
          We sent a link to{" "}
          <span className="font-medium text-foreground">{sentTo}</span>. Open it
          on this device to finish signing in.
        </p>
        <Button
          variant="secondary"
          onClick={() => setSentTo(null)}
          className="cursor-pointer"
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-1 text-center">
        <h1 className="font-display text-4xl">Welcome</h1>
        <p className="text-sm text-muted-foreground">
          Sign in or create an account to buy and sell.
        </p>
      </div>
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
          <TabsTrigger value="link">Email link</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form onSubmit={signIn} className="space-y-4 pt-4">
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={busy}
            >
              {busy && <Spinner />} Sign in
            </Button>
            <button
              type="button"
              onClick={resetPassword}
              disabled={busy}
              className="w-full cursor-pointer text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot your password?
            </button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={signUp} className="space-y-4 pt-4">
            <Field
              id="name"
              label="Display name (optional)"
              autoComplete="nickname"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Field
              id="new-email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              id="new-password"
              label={`Password (at least ${MIN_PASSWORD} characters)`}
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              You must be 18 or older. After you sign in you&apos;ll prove your age with your date of birth, a
              photo of a government ID and a selfie holding it. Posting, messaging and buying unlock once
              it&apos;s approved.
            </p>
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={busy}
            >
              {busy && <Spinner />} Create account
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="link">
          <form onSubmit={sendLink} className="space-y-4 pt-4">
            <Field
              id="link-email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll email you a one-time link. New here? The link creates your
              account too. You must be 18 or older and will prove your age
              with a government ID after signing in.
            </p>
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={busy}
            >
              {busy && <Spinner />} Email me a sign-in link
            </Button>
          </form>
        </TabsContent>
      </Tabs>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to the shop
        </Link>
      </p>
    </div>
  );
}
