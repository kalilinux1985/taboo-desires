"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

/** Buyers' profile visibility: private (only you) or visible to everyone. */
export default function ProfileVisibility({ initialPrivate }: { initialPrivate: boolean }) {
  const setPrivate = useMutation(api.users.setProfilePrivate);
  const [value, setValue] = useState(initialPrivate ? "yes" : "no");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setPrivate({ isPrivate: value === "yes" });
      toast.success(value === "yes" ? "Your profile is now private" : "Your profile is now visible to everyone");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not update your profile visibility"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Profile Visibility</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="setting-profilePrivate">Set Profile to Private</Label>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger id="setting-profilePrivate" className="w-full cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="settings-menu bg-[#111317] shadow-none">
              <SelectItem value="no" className="cursor-pointer">No - Visible to everyone</SelectItem>
              <SelectItem value="yes" className="cursor-pointer">Yes - Make my profile private</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">A private profile can only be seen by you. Everyone else sees that it's private.</p>
        </div>
        <Button onClick={save} disabled={saving} className="w-fit cursor-pointer">
          {saving && <Spinner />} Update Visibility
        </Button>
      </CardContent>
    </Card>
  );
}
