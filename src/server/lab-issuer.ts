import "server-only";
/**
 * SIMULATION of the government lab system of record (DoH premarital screening
 * / Emirati Genome Programme). This module and the LabRecord table are the only
 * places plaintext carrier genes exist on the server. In production this would be
 * an external DoH system; Amanah's app server would only receive signed credentials
 * addressed to the participant's device.
 */
import type { PrismaClient } from "@prisma/client";
import { signPayload, type Credential, type CredentialPayload } from "@/lib/credential";
import { PANEL_VERSION } from "@/lib/config";
import { parseJson, toJson } from "@/lib/json";
import { labSecretKey } from "./secrets";

export function makeLabRecord(userId: string, genes: string[], issuedAt = new Date()) {
  const payload: CredentialPayload = {
    subjectId: userId,
    carrierGenes: [...genes].sort(),
    panelVersion: PANEL_VERSION,
    issuedAt: issuedAt.toISOString(),
  };
  const { signature } = signPayload(payload, labSecretKey());
  return {
    userId,
    carrierGenes: toJson(payload.carrierGenes),
    panelVersion: PANEL_VERSION,
    issuedAt,
    signature,
  };
}

export async function issueCredential(
  db: PrismaClient,
  userId: string,
): Promise<Credential | null> {
  const rec = await db.labRecord.findUnique({ where: { userId } });
  if (!rec) return null;
  const payload: CredentialPayload = {
    subjectId: rec.userId,
    carrierGenes: parseJson<string[]>(rec.carrierGenes, []),
    panelVersion: rec.panelVersion,
    issuedAt: rec.issuedAt.toISOString(),
  };
  return signPayload(payload, labSecretKey());
}

/** Used only by MATCHING_MODE=trusted (isolated matcher) — see src/server/trusted-matcher.ts. */
export async function labGenesFor(db: PrismaClient, userId: string): Promise<string[]> {
  const rec = await db.labRecord.findUnique({ where: { userId } });
  return parseJson<string[]>(rec?.carrierGenes, []);
}
