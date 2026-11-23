"use client";

import { Input } from "@/components/ui/input.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useNavigate, useSearchParams } from "@/lib/navigation.ts";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { callBackend, supabase } from "@/lib/backend/client.ts";
import { useAuth } from "@/components/providers/auth.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";
import { callbackUrl, resolveReturnTo } from "./return-to.ts";

// The sign-in design: logo and wordmark over a framed card on the left, the
// tiled portrait filling the right half. Sign-up and the email link use the
// same card. Page #0c0f15, frame #1f2126, card #141519, violet #7c3aed.

type Mode = "signin" | "signup" | "link";

const MIN_PASSWORD = 8;
const MIN_AGE = 18;


const ROUNDED = "[font-family:var(--font-signin-rounded),'Comfortaa',ui-rounded,sans-serif]";
const SERIF = "[font-family:var(--font-signin-serif),Cambria,Georgia,serif]";

const FIELD = cn(
  SERIF,
  "signin-field h-[42px] w-full rounded-[5px] border px-4 text-[17px] tracking-[0.02em] text-white outline-none placeholder:text-white/70 focus:border-[#7c3aed]",
);
const SUBMIT = cn(
  ROUNDED,
  "flex h-[38px] w-full cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#7c3aed] text-[16px] font-bold text-white transition-colors hover:bg-[#5b24b3] disabled:cursor-default disabled:opacity-60",
);
const FOOTNOTE = cn(ROUNDED, "text-center text-[12px] text-white");
const FOOT_LINK = "cursor-pointer text-[#7c3aed] underline underline-offset-2 hover:text-[#9d5cff]";

/** The two-column page: the card on the left, the portrait on the right. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-[#0c0f15] text-white lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Link href="/" className="flex flex-col items-center gap-[10px]">
          <img src="/signin/logo.png" alt="" className="size-[122px]" />
          <span className="[font-family:var(--font-nurma),Arial,sans-serif] text-[40px] leading-none text-[#69269e] sm:text-[44px]">Taboo Desire&apos;s</span>
        </Link>
        <div className="mt-[18px] w-full max-w-[498px] rounded-[5px] border border-[#59595b40] bg-[#1f2126] p-[10px] shadow-[0_10px_22px_rgba(0,0,0,0.6)]">
          <div className="rounded-[5px] border border-[#59595b40] bg-[#141519] px-6 py-10 shadow-[0_6px_16px_rgba(0,0,0,0.55)] sm:px-[50px]">{children}</div>
        </div>
      </div>
      {/* The grid in the picture is transparent, so the page shows through the gaps */}
      <div className="relative hidden min-h-dvh lg:block">
        <img
          src="/signin/right.webp"
          alt=""
          className="absolute inset-0 size-full object-cover object-[center_top]"
        />
      </div>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className={cn(SERIF, "flex flex-col items-center gap-[10px] text-center")}>
      <h1 className="text-[40px] leading-none text-white sm:text-[44px]">{title}</h1>
      <p className="text-[16px] text-white">{sub}</p>
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
  const [is18, setIs18] = useState(false);
  const [accountType, setAccountType] = useState<"buyer" | "seller" | null>(null);
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
    if (!name.trim()) {
      toast.error("Choose a username");
      return;
    }
    if (!accountType) {
      toast.error("Choose whether you're signing up as a buyer or a seller");
      return;
    }
    if (!is18) {
      toast.error(`Confirm that you are ${MIN_AGE} or older`);
      return;
    }
    void run(async () => {
      const free = await callBackend<boolean>("users.usernameAvailable", { name: name.trim() }, null);
      if (!free.value) throw new Error("That username is taken. Please choose another.");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl(returnTo),
          // Age, country and gender are chosen in Settings right after the email is confirmed
          data: { accountType, name: name.trim() },
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
      <Shell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#7c3aed]/20 text-[#7c3aed]">
            <Mail className="size-6" />
          </div>
          <Heading title="Check your email" sub="Open the link on this device to finish signing in" />
          <p className={cn(SERIF, "text-[14px]")}>
            We sent it to <span className="text-white">{sentTo}</span>.
          </p>
          <Button variant="plain" size="none" type="button" onClick={() => setSentTo(null)} className={cn(FOOTNOTE, FOOT_LINK, "mt-2")}>
            Use a different email
          </Button>
        </div>
      </Shell>
    );
  }

  const switchTo = (next: Mode) => (
    <Button variant="plain" size="none" type="button" onClick={() => setMode(next)} className={FOOT_LINK}>
      HERE
    </Button>
  );

  return (
    <Shell>
      {mode === "signin" && (
        <form onSubmit={signIn} className="flex flex-col gap-[26px]">
          <Heading title="Welcome Back" sub="Log into your account" />
          <div className="flex flex-col gap-[26px]">
            {/* Accounts are by email, so the field takes an email where the design says username */}
            <Input
              id="email"
              name="email"
              aria-label="Email"
              type="email"
              autoComplete="email"
              required
              placeholder="EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
            <Input
              id="password"
              name="password"
              aria-label="Password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD}
            />
          </div>
          <Button variant="plain" size="none" type="submit" className={SUBMIT} disabled={busy}>
            {busy && <Spinner />} Sign-in
          </Button>
          <p className={FOOTNOTE}>Don&apos;t have an account? Sign-up {switchTo("signup")}</p>
          <p className={cn(FOOTNOTE, "-mt-4 flex flex-wrap justify-center gap-x-3")}>
            <Button variant="plain" size="none" type="button" onClick={resetPassword} disabled={busy} className={FOOT_LINK}>
              Forgot your password?
            </Button>
            <Button variant="plain" size="none" type="button" onClick={() => setMode("link")} className={FOOT_LINK}>
              Email me a sign-in link
            </Button>
          </p>
        </form>
      )}

      {mode === "signup" && (
        <form onSubmit={signUp} className="flex flex-col gap-[26px]">
          <Heading title="Create Account" sub="Sign up for an account" />
          <div className="flex flex-col gap-[26px]">
            <Input
              id="name"
              name="name"
              aria-label="Username"
              autoComplete="nickname"
              required
              maxLength={40}
              placeholder="USERNAME"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
            />
            <Input
              id="new-email"
              name="email"
              aria-label="Email"
              type="email"
              autoComplete="email"
              required
              placeholder="EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
            <Input
              id="new-password"
              name="new-password"
              aria-label={`Password (at least ${MIN_PASSWORD} characters)`}
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD}
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD}
            />
          </div>
          <div role="radiogroup" aria-label="Account type" className="flex flex-col gap-2">
            <p className={cn(FOOTNOTE, "text-[13px]")}>Choose what type of profile you want to signup for?</p>
            <div className="grid grid-cols-2 gap-3">
              {(["buyer", "seller"] as const).map((t) => (
                <Button variant="plain" size="none"
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={accountType === t}
                  onClick={() => setAccountType(t)}
                  className={cn(
                    ROUNDED,
                    "h-[42px] cursor-pointer rounded-[5px] border text-[15px] font-bold capitalize transition-colors",
                    accountType === t
                      ? "border-[#7c3aed] bg-[#7c3aed]/30 text-white"
                      : "border-[#33333355] text-white hover:border-[#7c3aed]",
                  )}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <label className={cn(SERIF, "flex cursor-pointer items-start gap-3 text-[14px] text-white")}>
            <Checkbox
              id="confirm-18"
              name="confirm-18"
              required
              checked={is18}
              onCheckedChange={(c) => setIs18(c === true)}
              className="mt-0.5"
            />
            <span>I confirm that I am {MIN_AGE} years of age or older.</span>
          </label>
          <p className={cn(FOOTNOTE, "-mt-3 text-[11px]")}>
            By signing up you agree to the{" "}
            <Link href="/terms" target="_blank" className={FOOT_LINK}>Terms</Link>,{" "}
            <Link href="/privacy" target="_blank" className={FOOT_LINK}>Privacy Policy</Link> and{" "}
            <Link href="/content-policy" target="_blank" className={FOOT_LINK}>Content Policy</Link>.
          </p>
          <p className={cn(FOOTNOTE, "-mt-3 text-[11px]")}>
            Passwords need at least {MIN_PASSWORD} characters.
          </p>
          <Button variant="plain" size="none" type="submit" className={SUBMIT} disabled={busy}>
            {busy && <Spinner />} Sign-up
          </Button>
          <p className={FOOTNOTE}>Already have an account? Sign-in {switchTo("signin")}</p>
        </form>
      )}

      {mode === "link" && (
        <form onSubmit={sendLink} className="flex flex-col gap-[26px]">
          <Heading title="Email Link" sub="We'll email you a one-time sign-in link" />
          <Input
            id="link-email"
            name="email"
            aria-label="Email"
            type="email"
            autoComplete="email"
            required
            placeholder="EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
          <p className={cn(FOOTNOTE, "-mt-3 text-[11px]")}>
            New here? The link creates your account too. You must be 18 or older.
          </p>
          <Button variant="plain" size="none" type="submit" className={SUBMIT} disabled={busy}>
            {busy && <Spinner />} Email me a link
          </Button>
          <p className={FOOTNOTE}>Use a password instead? Sign-in {switchTo("signin")}</p>
        </form>
      )}
    </Shell>
  );
}
