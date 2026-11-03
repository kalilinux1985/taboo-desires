import { z } from "zod";
import type { Doc } from "@/lib/backend/types.ts";

export type CustomStatus = Doc<"customRequests">["status"];

/** Dollar string like "40" or "40.50", turned into cents on submit. */
export const priceField = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a price like 40 or 40.50")
  .refine((v) => Number(v) >= 1 && Number(v) <= 10000, "Between $1 and $10,000");

export const toCents = (dollars: string) => Math.round(Number(dollars) * 100);

export const STATUS_LABEL: Record<CustomStatus, string> = {
  pending: "Open",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
};
