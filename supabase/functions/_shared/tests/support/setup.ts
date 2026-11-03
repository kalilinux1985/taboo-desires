import { afterEach } from "vitest";
import { closeAllTestBackends } from "./backend.ts";

afterEach(async () => {
  await closeAllTestBackends();
});
