"use client";

import { useState, type FormEvent } from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { formatCoins } from "@/shared/coins.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";

/** Admins add Taboo Coins to an account (for testing, or as a goodwill credit). A negative amount takes coins away. */
export default function CoinGrant() {
  const grant = useMutation(api.coins.grant);
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await grant({ username, amount: Number(amount), note: note || undefined });
      toast.success(`${r.name} now has ${formatCoins(r.balance)}`);
      setAmount("");
      setNote("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't change the balance"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-5 text-[#7c3aed]" /> Grant Taboo Coins
        </CardTitle>
        <CardDescription>Add coins to a member's account. Use a negative number to take coins away. Every change is recorded in their coin history.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div className="grid gap-2">
            <Label htmlFor="grant-user">Username</Label>
            <Input id="grant-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="velvet-rose" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="grant-amount">Coins</Label>
            <Input id="grant-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9-]/g, ""))} placeholder="1000" required />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="grant-note">Note (optional, shown in their history)</Label>
            <Input id="grant-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Testing" />
          </div>
          <Button type="submit" disabled={busy} className="w-fit cursor-pointer bg-[#7c3aed] text-white hover:bg-[#7c3aed]/85">
            Update balance
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
