import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@/lib/backend/react.tsx";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { priceField, toCents } from "@/lib/custom-requests.ts";

const schema = z.object({ price: priceField, note: z.string().trim().max(300) });
type Values = z.infer<typeof schema>;

function CounterForm({
  requestId,
  currentCents,
  onDone,
}: {
  requestId: Id<"customRequests">;
  currentCents: number;
  onDone: () => void;
}) {
  const respond = useMutation(api.customRequests.respond);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { price: "", note: "" } });

  const submit = form.handleSubmit(async ({ price, note }) => {
    const offerCents = toCents(price);
    if (offerCents === currentCents) {
      form.setError("price", { message: "That's the same as the current offer. Accept it instead." });
      return;
    }
    try {
      await respond({ requestId, action: "counter", offerCents, note });
      toast.success("Counter-offer sent");
      onDone();
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not send counter-offer"));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your price (USD)</FormLabel>
              <FormControl>
                <Input inputMode="decimal" placeholder={String(currentCents / 100)} autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} maxLength={300} placeholder="Extra wear days add a little to the price." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting} className="cursor-pointer">
            {form.formState.isSubmitting && <Spinner />} Send counter-offer
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function CounterDialog({
  requestId,
  currentCents,
  open,
  onOpenChange,
}: {
  requestId: Id<"customRequests">;
  currentCents: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Counter-offer</DialogTitle>
          <DialogDescription>The current offer is {formatPrice(currentCents)}. Suggest a different price.</DialogDescription>
        </DialogHeader>
        {open && <CounterForm requestId={requestId} currentCents={currentCents} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
