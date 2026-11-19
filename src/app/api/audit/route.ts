import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { verifyAuditChain } from "@/server/audit";

/** Recomputes the whole hash chain. */
export const POST = handle(async () => {
  await requireUser();
  return verifyAuditChain(db);
});
