import { useRef, useState } from "react";
import { Camera, CircleCheck, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import { MIN_AGE, isAdult, parseBirthDate } from "@/shared/age.ts";
import { useAccess } from "@/hooks/use-access.ts";
import { useAuth } from "@/components/providers/auth.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";

const MAX_BYTES = 10 * 1024 * 1024;

/** One photo slot: a button that opens the picker, ticked once a photo is chosen. */
function PhotoPick({
  label,
  hint,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  file: File | null;
  onPick: (file: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const choose = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return void toast.error("Please choose a photo");
    if (f.size > MAX_BYTES) return void toast.error("Photos must be under 10MB");
    onPick(f);
  };
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[1px] border border-white/25 bg-[#0F172A] px-3 py-2.5 text-left text-sm hover:border-violet-600"
      >
        {file ? (
          <CircleCheck className="size-5 shrink-0 text-violet-600" />
        ) : (
          <Camera className="size-5 shrink-0 text-violet-600" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate">{file ? file.name : "Choose or take a photo"}</span>
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </span>
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/**
 * Required for every buyer and seller: date of birth (18+), a photo of a
 * government ID and a selfie holding it. Shown once the account type is picked,
 * until an admin approves (the "in review" banner covers the wait).
 */
export default function AgeVerificationDialog() {
  const access = useAccess();
  const { signout } = useAuth();
  const state = useQuery(api.ageVerification.mine, access ? {} : "skip");
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const submit = useMutation(api.ageVerification.submit);
  const [birthDate, setBirthDate] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Admins are exempt; new members pick an account type first; pending waits in the banner
  const needed =
    !!access &&
    access.ageVerified === false &&
    !access.isAdmin &&
    !!access.accountType &&
    !!state &&
    state.status !== "pending";
  const underage = state?.status === "underage";
  const today = new Date().toISOString().slice(0, 10);

  const born = parseBirthDate(birthDate);
  const adult = !!born && isAdult(born, new Date());
  // An under-18 date needs nothing else; the server records it so the lock-out holds on every device
  const ready = !!born && (!adult || (confirmed && !!idPhoto && !!selfie));

  const send = async () => {
    if (!born) return toast.error("Enter your date of birth");
    if (!adult) {
      setBusy(true);
      try {
        await submit({ birthDate: born });
      } catch (e) {
        toast.error(getErrorMessage(e, "Something went wrong"));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!idPhoto || !selfie) return toast.error("Add both photos");
    setBusy(true);
    try {
      // Private photos: only admins get a short-lived link, deleted after review
      const idStorageId = await uploadFile(generateUploadUrl, idPhoto, "private");
      const selfieStorageId = await uploadFile(generateUploadUrl, selfie, "private");
      await submit({ birthDate: born, idPhotoStorageId: idStorageId, selfieStorageId });
      toast.success("Sent for review. We'll unlock your account once it's approved.");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not send your documents"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={needed}>
      <AlertDialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {underage ? (
          <>
            <AlertDialogHeader className="items-center text-center sm:items-center sm:text-center">
              <ShieldAlert className="size-10 text-violet-600" />
              <AlertDialogTitle className="font-display text-3xl">
                You can&apos;t use Taboo Desires
              </AlertDialogTitle>
              <AlertDialogDescription>
                You must be {MIN_AGE} or older. If you entered your date of birth by mistake, contact
                support.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center">
              <Button variant="secondary" className="cursor-pointer" onClick={() => void signout()}>
                Sign out
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-3xl">
                Verify you&apos;re {MIN_AGE} or older
              </AlertDialogTitle>
              <AlertDialogDescription>
                Taboo Desires is for adults only. Send your date of birth, a photo of a government ID
                (passport, driver&apos;s licence or national ID) and a selfie holding it. Only admins
                can see them, and they&apos;re deleted as soon as they&apos;ve been checked.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {state?.status === "rejected" && (
              <p className="rounded-[1px] border border-white/25 bg-[#0F172A] px-3 py-2 text-sm">
                Your last submission wasn&apos;t approved
                {state.reason ? `: ${state.reason}` : "."} Please try again with clearer photos.
              </p>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="birth-date">Date of birth</Label>
                <Input
                  id="birth-date"
                  type="date"
                  autoComplete="bday"
                  min="1900-01-01"
                  max={today}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <PhotoPick
                label="Photo of your government ID"
                hint="The side with your photo and date of birth"
                file={idPhoto}
                onPick={setIdPhoto}
              />
              <PhotoPick
                label="Selfie holding your ID"
                hint="Your face and the ID must both be clear"
                file={selfie}
                onPick={setSelfie}
              />
              <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#7f22fe]"
                />
                I am {MIN_AGE} or older, and these documents are mine.
              </label>
            </div>

            <AlertDialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" className="cursor-pointer" onClick={() => void signout()}>
                Sign out
              </Button>
              <Button
                className="cursor-pointer"
                disabled={busy || !ready}
                onClick={() => void send()}
              >
                {busy && <Spinner />} Send for review
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Slim bar under the page top while an admin is still checking the documents. */
export function AgeVerificationNotice() {
  const access = useAccess();
  const state = useQuery(api.ageVerification.mine, access ? {} : "skip");
  if (!access || access.ageVerified !== false || access.isAdmin || state?.status !== "pending") return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b border-white/25 bg-[#030917]/50 px-4 py-2 text-center text-sm">
      <Clock className="size-4 shrink-0 text-violet-600" />
      <span>Your age check is in review. You can browse now; posting, messaging and buying unlock once it&apos;s approved.</span>
    </div>
  );
}
