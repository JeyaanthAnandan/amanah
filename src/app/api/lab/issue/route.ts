import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/server/http";
import { issueCredential } from "@/server/lab-issuer";
import { walletToken } from "@/server/secrets";
import { appendAudit } from "@/server/audit";
import { PANEL_GENE_COUNT } from "@/lib/config";

/**
 * Simulated government lab issuance: returns an Ed25519-signed credential to the
 * participant's device. The app never persists it; the browser stores it locally.
 */
export const POST = handle(async () => {
  const user = await requireUser("participant");
  const credential = await issueCredential(db, user.id);
  if (!credential) throw new HttpError(404, "no_lab_record");
  await appendAudit(db, { actorId: user.id, subjectUserId: user.id, action: "WALLET_ISSUED" });
  return { credential, walletToken: walletToken(user.id), geneCount: PANEL_GENE_COUNT };
});
