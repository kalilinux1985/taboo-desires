"use client";

import { useCallback } from "react";
import { useNavigate } from "@/lib/navigation.ts";
import { useAccess } from "@/hooks/use-access.ts";

/** Actions sellers need Premium for. */
export type PremiumAction = "list" | "message" | "post";

/**
 * Sellers without Premium can't list, message or post. Instead of failing,
 * those actions send them to the subscription page, which says why.
 */
export function useUpgradeGate() {
  const access = useAccess();
  const navigate = useNavigate();

  const needsUpgrade = useCallback(
    (action: PremiumAction) =>
      !!access && access.accountType === "seller" && !access.isAdmin && !access.can[action],
    [access],
  );
  const sendToPlans = useCallback(
    (action: PremiumAction, options?: { replace?: boolean }) =>
      navigate(`/pricing?for=${action}`, options),
    [navigate],
  );
  /** True (and redirects) when the seller needs Premium for this action. */
  const blockAndRedirect = useCallback(
    (action: PremiumAction) => {
      if (!needsUpgrade(action)) return false;
      sendToPlans(action);
      return true;
    },
    [needsUpgrade, sendToPlans],
  );

  return { needsUpgrade, sendToPlans, blockAndRedirect };
}
