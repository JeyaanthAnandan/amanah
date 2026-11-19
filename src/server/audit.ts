import type { PrismaClient } from "@prisma/client";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

export const GENESIS = "0".repeat(64);

type AuditInput = {
  actorId: string;
  action: string;
  subjectUserId?: string | null;
  checkId?: string | null;
  detail?: string | null;
};

type Row = AuditInput & { seq: number; at: Date; prevHash: string };

export function hashEvent(e: Row): string {
  const canonical = JSON.stringify([
    e.seq, e.actorId, e.subjectUserId ?? null, e.action, e.checkId ?? null,
    e.detail ?? null, e.at.toISOString(), e.prevHash,
  ]);
  return bytesToHex(sha256(utf8ToBytes(canonical)));
}

// Serialise appends within this process so the chain never forks.
let chain: Promise<unknown> = Promise.resolve();

/** Append one hash-chained audit event. */
export function appendAudit(db: PrismaClient, input: AuditInput) {
  const run = chain.then(async () => {
    const last = await db.auditEvent.findFirst({ orderBy: { seq: "desc" } });
    const row: Row = {
      ...input,
      seq: (last?.seq ?? 0) + 1,
      at: new Date(),
      prevHash: last?.hash ?? GENESIS,
    };
    return db.auditEvent.create({ data: { ...row, hash: hashEvent(row) } });
  });
  chain = run.catch(() => undefined);
  return run;
}

/** Audit one event per subject (e.g. both participants of a check). */
export async function auditFor(db: PrismaClient, subjects: string[], input: Omit<AuditInput, "subjectUserId">) {
  for (const s of subjects) await appendAudit(db, { ...input, subjectUserId: s });
}

export async function verifyAuditChain(db: PrismaClient): Promise<{ ok: boolean; checked: number; brokenAt?: number }> {
  const events = await db.auditEvent.findMany({ orderBy: { seq: "asc" } });
  let prev = GENESIS;
  for (const e of events) {
    if (e.prevHash !== prev || hashEvent(e) !== e.hash) return { ok: false, checked: events.length, brokenAt: e.seq };
    prev = e.hash;
  }
  return { ok: true, checked: events.length };
}
