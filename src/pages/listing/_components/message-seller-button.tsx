import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackendAuth, useMutation } from "@/lib/backend/react.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { useAccess } from "@/hooks/use-access.ts";
import { deniedMessage } from "@/shared/accounts.ts";
import UpgradeNotice from "@/components/upgrade-notice.tsx";

const QUICK_MESSAGES = [
  "Is this still available?",
  "Can you send more photos?",
  "Are these authentic?",
];

export default function MessageSellerButton({
  listingId,
  sellerName,
}: {
  listingId: Id<"listings">;
  sellerName: string;
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useBackendAuth();
  const { signin } = useAuth();
  const access = useAccess();
  const start = useMutation(api.messages.start);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(QUICK_MESSAGES[0]);
  const [sending, setSending] = useState(false);
  const blocked = !!access && !access.can.message;

  const openDialog = () => {
    if (!isAuthenticated) {
      void signin();
      return;
    }
    setOpen(true);
  };

  const send = async () => {
    setSending(true);
    try {
      const id = await start({ listingId, body });
      navigate(`/messages/${id}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Message failed to send"));
      setSending(false);
    }
  };

  return (
    <>
      <Button size="lg" variant="secondary" className="flex-1 cursor-pointer" onClick={openDialog}>
        <MessageCircle /> Message seller
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {sellerName}</DialogTitle>
            <DialogDescription>Ask anything about this item.</DialogDescription>
          </DialogHeader>
          {blocked ? (
            <UpgradeNotice message={deniedMessage("message", access.accountType ?? undefined)} />
          ) : (
          <>
          <div className="flex flex-wrap gap-2">
            {QUICK_MESSAGES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setBody(q)}
                className="cursor-pointer rounded-sm border bg-secondary px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              >
                {q}
              </button>
            ))}
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={4}
          />
          <DialogFooter>
            <Button onClick={send} disabled={!body.trim() || sending} className="cursor-pointer">
              {sending && <Spinner />} Send message
            </Button>
          </DialogFooter>
          </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
