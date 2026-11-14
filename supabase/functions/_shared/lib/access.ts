import { AppError } from "../core/errors.ts";
import type { QueryCtx } from "../core/functions.ts";
import type { Doc } from "../core/schema.ts";
import { requireUser } from "./auth.ts";
import { getPlan } from "./subscription.ts";
import {
  capabilities,
  deniedMessage,
  type Capabilities,
} from "../domain/accounts.ts";

export async function getCapabilities(
  ctx: QueryCtx,
  user: Doc<"users">,
): Promise<Capabilities> {
  const isPro = (await getPlan(ctx, user._id)) === "pro";
  return capabilities(
    user.accountType,
    isPro,
    user.role === "admin",
    !!user.ageVerified,
  );
}

/** Throws a FORBIDDEN error with an upgrade hint unless the user may perform the action. */
export async function requireCapability(
  ctx: QueryCtx,
  action: keyof Capabilities,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  const can = await getCapabilities(ctx, user);
  if (!can[action]) {
    throw new AppError({
      code: "FORBIDDEN",
      message: deniedMessage(action, user.accountType, !!user.ageVerified),
    });
  }
  return user;
}
