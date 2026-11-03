import { makeApi } from "../../core/api.ts";
import type { BackendRegistry } from "../../registry.ts";

export const api = makeApi<BackendRegistry>();
/** Internal functions are addressed the same way; only tests and cron may call them. */
export const internal = api;
