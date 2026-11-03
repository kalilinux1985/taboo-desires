import { useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import AvatarPicker from "./avatar-picker.tsx";
import AvatarDropzone from "./avatar-dropzone.tsx";
import type { AvatarChange } from "@/hooks/use-avatar-upload.ts";

export type EditableProfile = {
  name: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
};

const FIELDS = [
  {
    key: "shopName",
    label: "Username",
    placeholder: "Velvet Rose",
    max: 40,
    hint: "This is your alias on Taboo Desires and protects your identity.",
  },
  { key: "location", label: "Location", placeholder: "Somewhere sunny", max: 60, hint: null },
] as const;

/**
 * Profile picture, name, location and bio. Shared by the shop dialog and Settings.
 * The "buyer" layout mirrors allthingsworn: username, large image drop area, then bio.
 */
export default function ProfileForm({
  profile,
  onSaved,
  layout = "seller",
}: {
  profile: EditableProfile;
  onSaved?: () => void;
  layout?: "seller" | "buyer";
}) {
  const updateProfile = useMutation(api.users.updateProfile);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<AvatarChange>(undefined);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState({
    shopName: profile.name,
    bio: profile.bio ?? "",
    location: profile.location ?? "",
  });

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ ...form, avatarStorageId: avatar });
      // Picture is now saved, so later saves should keep it as-is
      setAvatar(undefined);
      toast.success("Profile saved");
      onSaved?.();
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not save profile"));
    } finally {
      setSaving(false);
    }
  };

  const pickerProps = {
    name: form.shopName || profile.name,
    currentUrl: profile.avatarUrl,
    onChange: setAvatar,
    onUploadingChange: setAvatarUploading,
  };
  const usernameField = FIELDS[0];
  const bioField = (
    <div className="grid gap-2">
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        maxLength={300}
        rows={4}
        placeholder={
          layout === "buyer"
            ? "Tell sellers a little about yourself and what you like."
            : "Flirty, friendly, and always discreet. Customs welcome."
        }
        value={form.bio}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
      />
      {layout === "buyer" && (
        <p className="text-xs text-muted-foreground">Introduce yourself to sellers in a few words.</p>
      )}
    </div>
  );
  const saveRow = (
    <div className="flex justify-end">
      <Button onClick={save} disabled={saving || avatarUploading} className="cursor-pointer">
        {saving && <Spinner />} Save
      </Button>
    </div>
  );

  if (layout === "buyer") {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor={usernameField.key} className="text-base font-semibold">
            {usernameField.label}
          </Label>
          <Input
            id={usernameField.key}
            maxLength={usernameField.max}
            placeholder="Kaliborn85"
            className="h-12 text-base"
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">{usernameField.hint}</p>
        </div>
        <div className="grid gap-2">
          <Label className="text-base font-semibold">Profile image</Label>
          <AvatarDropzone {...pickerProps} />
          <p className="text-xs text-muted-foreground">No nudity. Images will be removed.</p>
        </div>
        {bioField}
        {saveRow}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label>Profile picture</Label>
        <AvatarPicker {...pickerProps} />
        <p className="text-xs text-muted-foreground">No nudity. Images that break this rule will be removed.</p>
      </div>
      {FIELDS.map((f) => (
        <div key={f.key} className="grid gap-2">
          <Label htmlFor={f.key}>{f.label}</Label>
          <Input
            id={f.key}
            maxLength={f.max}
            placeholder={f.placeholder}
            value={form[f.key]}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
          />
          {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
        </div>
      ))}
      {bioField}
      {saveRow}
    </div>
  );
}
