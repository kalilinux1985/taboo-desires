"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useBackendAuth, useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useNavigate } from "@/lib/navigation.ts";
import { getErrorMessage } from "@/lib/listings.ts";
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

/** "Message seller" from the profile: writes the first message, then opens the chat. */
export default function MessageSellerButton({
  sellerId,
  sellerName,
  className,
  label = "Message seller",
  showIcon = true,
}: {
  sellerId: Id<"users">;
  sellerName: string;
  className?: string;
  label?: string;
  showIcon?: boolean;
}) {
  const { isAuthenticated } = useBackendAuth();
  const { signin } = useAuth();
  const navigate = useNavigate();
  const start = useMutation(api.messages.startWithSeller);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const id = await start({ sellerId, body });
      setOpen(false);
      setBody("");
      navigate(`/messages/${id}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not send your message"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => (isAuthenticated ? setOpen(true) : void signin())}
        className={className}
      >
        {showIcon && <Mail />} {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {sellerName}</DialogTitle>
            <DialogDescription>Ask about an item, sizes or a custom order.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={body}
            maxLength={2000}
            rows={5}
            placeholder={`Hi ${sellerName}...`}
            onChange={(e) => setBody(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={send} disabled={!body.trim() || sending} className="cursor-pointer">
              {sending && <Spinner />} Send message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
