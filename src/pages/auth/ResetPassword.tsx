import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/backend/client.ts";
import { useAuth } from "@/components/providers/auth.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

const MIN_PASSWORD = 8;

/** Opened from the "reset your password" email: the link signs the user in, then they pick a new password. */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signin } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD)
      return toast.error(`Use at least ${MIN_PASSWORD} characters`);
    if (password !== confirm) return toast.error("The passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Your password has been updated");
    navigate("/", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-3xl">This link has expired</h1>
        <p className="text-muted-foreground">
          Request a new password reset email from the sign-in page.
        </p>
        <Button
          onClick={() => void signin({ returnTo: "/" })}
          className="cursor-pointer"
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-4"
    >
      <h1 className="font-display text-3xl">Choose a new password</h1>
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Repeat new password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy} className="cursor-pointer">
        {busy && <Spinner />} Save password
      </Button>
    </form>
  );
}
