import { AuthProvider } from "./auth.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { BackendProvider } from "@/lib/backend/react.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";

// Mono dark theme: no theme provider, the palette lives in :root only
export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <QueryClientProvider>
        <BackendProvider>
          <TooltipProvider>
            <Toaster theme="dark" />
            {children}
          </TooltipProvider>
        </BackendProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
