import { Link } from "react-router-dom";
import { MessageCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import RequireAuth from "@/components/require-auth.tsx";

// Order tracking arrives with the Checkout and orders milestone
export default function OrdersPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Purchases & sales</p>
        <h1 className="font-display text-4xl md:text-6xl">Orders</h1>
      </header>
      <RequireAuth message="Sign in to see your orders.">
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package />
            </EmptyMedia>
            <EmptyTitle>Order tracking is coming soon</EmptyTitle>
            <EmptyDescription>
              For now, buyers and sellers arrange payment and delivery directly in Messages.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm" className="cursor-pointer">
              <Link to="/messages">
                <MessageCircle /> Go to Messages
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </RequireAuth>
    </div>
  );
}
