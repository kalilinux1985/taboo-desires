import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit-test config for this app. Two projects run in one command:
//   - "backend"  the api Edge Function's handlers against a real Postgres schema
//                (in-process PGlite, or TEST_DATABASE_URL, e.g. from `supabase start`)
//   - "frontend" React components and logic, run in jsdom via Testing Library
//
// Keep tests hermetic: use the backend test harness and mocks instead of real
// deployments, network calls, or environment-dependent behavior.
export default defineConfig({
  resolve: {
    alias: {
      "@/backend": path.resolve(
        import.meta.dirname,
        "./supabase/functions/_shared",
      ),
      "@/shared": path.resolve(
        import.meta.dirname,
        "./supabase/functions/_shared/domain",
      ),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    passWithNoTests: true,
    // Restore Vitest mocks before each test to reduce state leakage.
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "backend",
          environment: "node",
          include: ["supabase/functions/_shared/tests/**/*.test.ts"],
          setupFiles: ["./supabase/functions/_shared/tests/support/setup.ts"],
          // Each test gets a fresh database
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/vitest.setup.ts"],
        },
      },
    ],
  },
});
