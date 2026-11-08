// Every backend function, addressed as "<module>.<function>" (e.g. "listings.get").
// The browser imports only the *type* of this registry to get typed calls.

import * as accountDeletion from "./modules/accountDeletion.ts";
import * as activity from "./modules/activity.ts";
import * as auctions from "./modules/auctions.ts";
import * as customRequests from "./modules/customRequests.ts";
import * as favorites from "./modules/favorites.ts";
import * as follows from "./modules/follows.ts";
import * as listings from "./modules/listings.ts";
import * as messages from "./modules/messages.ts";
import * as notifications from "./modules/notifications.ts";
import * as posts from "./modules/posts.ts";
import * as reviews from "./modules/reviews.ts";
import * as subscriptions from "./modules/subscriptions.ts";
import * as unlocks from "./modules/unlocks.ts";
import * as users from "./modules/users.ts";
import * as verification from "./modules/verification.ts";
import type { AnyFunctionDef } from "./core/functions.ts";

/** Keeps only the exported function definitions of a module (drops helpers and constants). */
type FunctionsOf<M> = {
  [K in keyof M as M[K] extends AnyFunctionDef ? K : never]: M[K];
};

function functionsOf<M extends Record<string, unknown>>(
  mod: M,
): FunctionsOf<M> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(mod)) {
    if (
      value &&
      typeof value === "object" &&
      "kind" in value &&
      "handler" in value
    )
      out[name] = value;
  }
  return out as FunctionsOf<M>;
}

export const registry = {
  accountDeletion: functionsOf(accountDeletion),
  activity: functionsOf(activity),
  auctions: functionsOf(auctions),
  customRequests: functionsOf(customRequests),
  favorites: functionsOf(favorites),
  follows: functionsOf(follows),
  listings: functionsOf(listings),
  messages: functionsOf(messages),
  notifications: functionsOf(notifications),
  posts: functionsOf(posts),
  reviews: functionsOf(reviews),
  subscriptions: functionsOf(subscriptions),
  unlocks: functionsOf(unlocks),
  users: functionsOf(users),
  verification: functionsOf(verification),
};

export type BackendRegistry = typeof registry;
