import { db } from "@/lib/db";
import { handle, HttpError } from "@/server/http";
import { seed } from "@/server/seed";

/** Demo-only: reseeds personas + simulated data. Disable with ALLOW_DEMO_RESET=0. */
export const POST = handle(async () => {
  if (process.env.ALLOW_DEMO_RESET === "0") throw new HttpError(403, "disabled");
  await seed(db);
  return { ok: true };
});
