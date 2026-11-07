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
import AvatarDropzone from "./avatar-dropzone.tsx";
import type { AvatarChange } from "@/hooks/use-avatar-upload.ts";

export type EditableProfile = {
  name: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
};

const USERNAME = {
  key: "shopName",
  label: "Username",
  max: 40,
  hint: "This is your alias on Taboo Desires and protects your identity.",
} as const;

/**
 * Username, profile image and bio, as on the Settings pages.
 */
export default function ProfileForm({
  profile,
  onSaved,
}: {
  profile: EditableProfile;
  onSaved?: () => void;
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
  const usernameField = USERNAME;
  const bioField = (
    <div className="grid gap-2">
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        maxLength={300}
        rows={4}
        placeholder="Tell people a little about yourself."
        value={form.bio}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">Introduce yourself in a few words.</p>
    </div>
  );
  const saveRow = (
    <div className="flex justify-end">
      <Button onClick={save} disabled={saving || avatarUploading} className="cursor-pointer">
        {saving && <Spinner />} Save
      </Button>
    </div>
  );

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
