import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthCallback from "./Callback.tsx";
import { authCallbackMessages } from "./callback-messages.ts";
import { resolveReturnTo } from "./return-to.ts";

const mocks = vi.hoisted(() => ({
  auth: {
    isAuthenticated: false,
    isLoading: true,
    error: null as Error | null,
    signin: vi.fn<(opts?: { returnTo?: string }) => Promise<void>>(),
  },
}));

vi.mock("@/components/providers/auth.tsx", () => ({
  useAuth: () => mocks.auth,
}));

function CallbackRoutes({
  url = "/auth/callback",
  ...props
}: React.ComponentProps<typeof AuthCallback> & {
  url?: string;
}): React.JSX.Element {
  return (
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback {...props} />} />
        <Route path="/" element={<div>App home</div>} />
        <Route path="/listing/:id" element={<div>Listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mocks.auth.isAuthenticated = false;
  mocks.auth.isLoading = true;
  mocks.auth.error = null;
  mocks.auth.signin.mockReset().mockResolvedValue(undefined);
});

describe("AuthCallback", () => {
  it.each([
    { messages: undefined, loading: "Loading..." },
    { messages: { loading: "Signing in..." }, loading: "Signing in..." },
    { messages: authCallbackMessages.de, loading: "Wird geladen..." },
  ])("localizes loading text: $loading", ({ messages, loading }) => {
    render(<CallbackRoutes messages={messages} />);
    expect(screen.getByText(loading)).toBeInTheDocument();
  });

  it("returns to the page the user started from once signed in", () => {
    mocks.auth.isLoading = false;
    mocks.auth.isAuthenticated = true;
    render(<CallbackRoutes url="/auth/callback?returnTo=%2Flisting%2Fabc" />);
    expect(screen.getByText("Listing page")).toBeInTheDocument();
  });

  it("ignores unsafe return paths", () => {
    mocks.auth.isLoading = false;
    mocks.auth.isAuthenticated = true;
    render(<CallbackRoutes url="/auth/callback?returnTo=%2F%2Fevil.example" />);
    expect(screen.getByText("App home")).toBeInTheDocument();
  });

  it("shows link errors and lets the user try again", async () => {
    mocks.auth.isLoading = false;
    render(
      <CallbackRoutes url="/auth/callback?error_description=Email+link+is+invalid+or+has+expired" />,
    );
    expect(
      screen.getByText("Email link is invalid or has expired"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.auth.signin).toHaveBeenCalledWith({ returnTo: "/" });
  });

  it("explains a missing session after waiting", () => {
    vi.useFakeTimers();
    try {
      mocks.auth.isLoading = false;
      render(<CallbackRoutes timeoutMs={1000} />);
      act(() => vi.advanceTimersByTime(1001));
      expect(
        screen.getByText(authCallbackMessages.en.missingState),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("resolveReturnTo", () => {
  it.each([
    [null, "/"],
    ["/listing/1?x=2", "/listing/1?x=2"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/auth/callback", "/"],
    ["/signin?returnTo=/x", "/"],
  ])("%s -> %s", (input, expected) => {
    expect(resolveReturnTo(input)).toBe(expected);
  });
});
