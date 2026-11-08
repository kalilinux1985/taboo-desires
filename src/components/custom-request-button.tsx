import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useNavigate } from "@/lib/navigation.ts";
import { Authenticated, Unauthenticated, useMutation } from "@/lib/backend/react.tsx";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { CATEGORIES, CONDITIONS, getErrorMessage, type Category, type Condition } from "@/lib/listings.ts";
import { priceField, toCents } from "@/lib/custom-requests.ts";
import { cn } from "@/lib/utils.ts";
import { useAccess } from "@/hooks/use-access.ts";

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];
const CONDITION_VALUES = CONDITIONS.map((c) => c.value) as [Condition, ...Condition[]];

const schema = z.object({
  category: z.enum(CATEGORY_VALUES, { message: "Pick an item" }),
  wearTime: z.enum(CONDITION_VALUES, { message: "Pick a wear time" }),
  size: z.string().trim().min(1, "Required").max(20),
  details: z.string().trim().min(10, "Tell the seller a bit more (10+ characters)").max(1000),
  budget: priceField,
});
type Values = z.infer<typeof schema>;

function RequestForm({ sellerId, sellerName, onDone }: { sellerId: Id<"users">; sellerName: string; onDone: () => void }) {
  const create = useMutation(api.customRequests.create);
  const navigate = useNavigate();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { size: "", details: "", budget: "" },
  });

  const submit = form.handleSubmit(async ({ budget, ...values }) => {
    try {
      await create({ sellerId, ...values, budgetCents: toCents(budget) });
      toast.success(`Request sent to ${sellerName}`, {
        action: { label: "View", onClick: () => navigate("/customs?tab=sent") },
      });
      onDone();
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not send your request"));
    }
  });

  const selectField = (
    name: "category" | "wearTime",
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value} className="cursor-pointer">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {selectField("category", "Item", CATEGORIES)}
          {selectField("wearTime", "Wear time", CONDITIONS)}
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size</FormLabel>
                <FormControl>
                  <Input placeholder="M" maxLength={20} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your budget (USD)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="45" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details and extras</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  maxLength={1000}
                  placeholder="Color, fabric, activities during wear, photos of you wearing it, a handwritten note..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground">
          The seller can accept, decline, or counter with a different price. Payment and delivery are arranged
          directly in Messages once you both agree.
        </p>
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting} className="cursor-pointer">
            {form.formState.isSubmitting && <Spinner />} Send request
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

/** "Request a custom" button that opens the request form. Signed-out visitors get a sign-in button. */
export default function CustomRequestButton({
  sellerId,
  sellerName,
  className,
}: {
  sellerId: Id<"users">;
  sellerName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const access = useAccess();
  return (
    <>
      <Authenticated>
        {/* Only buyers send custom requests */}
        {access?.can.buy && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className={cn("cursor-pointer", className)}>
              <Sparkles /> Request a custom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Custom request for {sellerName}</DialogTitle>
              <DialogDescription>
                Describe exactly what you want. You can track replies in{" "}
                <Link href="/customs" className="text-violet-600 underline-offset-2 hover:underline">
                  Custom requests
                </Link>
                .
              </DialogDescription>
            </DialogHeader>
            {/* Remount on open so the form starts empty */}
            {open && <RequestForm sellerId={sellerId} sellerName={sellerName} onDone={() => setOpen(false)} />}
          </DialogContent>
        </Dialog>
        )}
      </Authenticated>
      <Unauthenticated>
        <SignInButton signInText="Sign in to request a custom" showIcon={false} className={className} />
      </Unauthenticated>
    </>
  );
}
