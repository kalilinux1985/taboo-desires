import { makeApi } from "@/backend/core/api.ts";
import type { BackendRegistry } from "@/backend/registry.ts";

/** Typed references to every backend function, e.g. `api.listings.get`. */
export const api = makeApi<BackendRegistry>();
