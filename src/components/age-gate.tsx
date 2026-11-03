import { useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";

const STORAGE_KEY = "taboo-age-verified";

function readVerified(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "yes";
  } catch {
    return false;
  }
}

/** Adult-content confirmation shown once per browser. Children render only after confirming. */
export default function AgeGate({ children }: { children?: ReactNode }) {
  const [verified, setVerified] = useState(readVerified);

  const confirm = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "yes");
    } catch {
      // Storage blocked: still let them in for this session
    }
    setVerified(true);
  };

  return (
    <>
    {verified && children}
    <AlertDialog open={!verified}>
      <AlertDialogContent className="backdrop-blur">
        <AlertDialogHeader className="items-center text-center sm:items-center sm:text-center">
          <div className="flex size-12 items-center justify-center rounded-full text-violet-500">
            <ShieldAlert className="size-6" />
          </div>
          <AlertDialogTitle className="font-display text-3xl">
            Adults only
          </AlertDialogTitle>
          <AlertDialogDescription>
            Taboo Desires is a marketplace for worn intimate apparel. You must be
            18 or older to enter.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <Button asChild variant="secondary" className="cursor-pointer">
            <a href="https://www.google.com">I am under 18</a>
          </Button>
          <Button onClick={confirm} className="cursor-pointer">
            I am 18 or older
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
