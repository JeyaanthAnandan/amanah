import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, freshDb, Wallets } from "./helpers/db";
import { createCheck, decideMatch, expireDue, withdraw } from "@/server/checks";
import { checkView } from "@/server/views";
import { verifyAuditChain } from "@/server/audit";

const strip = (v: unknown) => JSON.parse(JSON.stringify(v, (k, val) => (["id", "createdAt", "expiresAt"].includes(k) ? undefined : val)));

describe("check lifecycle (PSI mode)", () => {
  beforeEach(async () => {
    vi.stubEnv("MATCHING_MODE", "psi");
    vi.stubEnv("DEMO_FAST", "1");
    await freshDb();
  });

  it("Ahmed × Fatima → shared risk; Stage 2 reveals the HBB condition", async () => {
    const w = new Wallets();
    const c = await createCheck(testDb, "mariam", "ahmed", "fatima");
    await w.accept("ahmed", c.id);
    await w.accept("fatima", c.id);
    expect((await testDb.check.findUnique({ where: { id: c.id } }))!.status).toBe("COMPUTING");
    await w.tickAll("ahmed", "fatima");
    const done = (await testDb.check.findUnique({ where: { id: c.id } }))!;
    expect(done.status).toBe("COMPLETE");
    expect(done.sharedRisk).toBe(true);

    const req = await checkView(testDb, done, "mariam");
    expect(req).toMatchObject({ kind: "requester", status: "COMPLETE" });
    expect(JSON.stringify(req)).not.toMatch(/sharedRisk|ACCEPTED|DECLINED/);

    await w.reveal("ahmed", "fatima", c.id);
    const v = await checkView(testDb, (await testDb.check.findUnique({ where: { id: c.id } }))!, "fatima");
    expect(v).toMatchObject({ kind: "participant", conditionIds: ["haemoglobin-disorders"], revealState: "REVEALED" });
  });

  it("Khalid × Noura → no shared risk; Ahmed × Noura → no shared risk", async () => {
    const w = new Wallets();
    const c1 = await createCheck(testDb, "saeed", "khalid", "noura");
    await w.accept("noura", c1.id); // order does not matter: Noura becomes P1
    await w.accept("khalid", c1.id);
    await w.tickAll("khalid", "noura");
    expect((await testDb.check.findUnique({ where: { id: c1.id } }))!.sharedRisk).toBe(false);

    const c2 = await createCheck(testDb, "mariam", "ahmed", "noura");
    await w.accept("ahmed", c2.id);
    await w.accept("noura", c2.id);
    await w.tickAll("ahmed", "noura");
    expect((await testDb.check.findUnique({ where: { id: c2.id } }))!.sharedRisk).toBe(false);
  });

  it("a decline is indistinguishable from no response, before and after expiry", async () => {
    const w = new Wallets();
    const declined = await createCheck(testDb, "saeed", "khalid", "noura");
    const silent = await createCheck(testDb, "mariam", "ahmed", "noura");
    await w.accept("khalid", declined.id);
    await w.accept("ahmed", silent.id);
    await decideMatch(testDb, "noura", declined.id, "DECLINED");

    const views = async (id: string, initiator: string, other: string) => {
      const c = (await testDb.check.findUnique({ where: { id } }))!;
      return { req: strip(await checkView(testDb, c, initiator)), other: strip(await checkView(testDb, c, other)) };
    };
    const a = await views(declined.id, "saeed", "khalid");
    const b = await views(silent.id, "mariam", "ahmed");
    expect(a.req.status).toBe("WAITING");
    expect(a.req.status).toBe(b.req.status);
    expect({ ...a.other, requester: null, other: null }).toEqual({ ...b.other, requester: null, other: null });
    expect(a.other.status).toBe("WAITING");

    // Notifications to the requester / other participant are identical too.
    const n = async (u: string, id: string) => (await testDb.notification.findMany({ where: { userId: u, checkId: id } })).map((x) => x.type);
    expect(await n("saeed", declined.id)).toEqual(await n("mariam", silent.id));
    expect(await n("khalid", declined.id)).toEqual(await n("ahmed", silent.id));

    await expireDue(testDb, new Date(Date.now() + 10 * 60_000));
    const a2 = await views(declined.id, "saeed", "khalid");
    const b2 = await views(silent.id, "mariam", "ahmed");
    expect(a2.req.status).toBe("NOT_COMPLETED");
    expect(b2.req.status).toBe("NOT_COMPLETED");
    expect(await n("saeed", declined.id)).toEqual(await n("mariam", silent.id));
  });

  it("withdrawal before the result stops the check without telling anyone", async () => {
    const w = new Wallets();
    const c = await createCheck(testDb, "mariam", "ahmed", "fatima");
    await w.accept("ahmed", c.id);
    await withdraw(testDb, "ahmed", c.id);
    await w.accept("fatima", c.id);
    await w.tickAll("ahmed", "fatima");
    const after = (await testDb.check.findUnique({ where: { id: c.id } }))!;
    expect(after.status).toBe("AWAITING_CONSENT");
    expect((await checkView(testDb, after, "mariam"))!.status).toBe("WAITING");
  });

  it("enforces rate limits with one neutral error", async () => {
    await createCheck(testDb, "mariam", "ahmed", "fatima");
    await createCheck(testDb, "mariam", "ahmed", "noura");
    await createCheck(testDb, "mariam", "khalid", "fatima");
    await expect(createCheck(testDb, "mariam", "khalid", "noura")).rejects.toMatchObject({ status: 429, message: "rate_limited" });
    // Participant limit: Ahmed is already in 2; a third from another initiator is OK, a fourth is not.
    await createCheck(testDb, "saeed", "ahmed", "khalid");
    await expect(createCheck(testDb, "saeed", "ahmed", "noura")).rejects.toMatchObject({ status: 429 });
  });

  it("no gene identifiers appear in any app table except LabRecord", async () => {
    const w = new Wallets();
    const c = await createCheck(testDb, "mariam", "ahmed", "fatima");
    await w.accept("ahmed", c.id);
    await w.accept("fatima", c.id);
    await w.tickAll("ahmed", "fatima");
    await w.reveal("ahmed", "fatima", c.id);

    const genes = ["HBB", "GJB2", "CYP21A2", "SMN1", "CYP1B1", "DNAH5", "RPE65", "CFTR"];
    const tables = (await testDb.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite%'",
    )).map((t) => t.name);
    expect(tables).toContain("LabRecord");
    for (const table of tables.filter((t) => t !== "LabRecord")) {
      const rows = await testDb.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${table}"`);
      const dump = JSON.stringify(rows, (_k, v) => (typeof v === "bigint" ? v.toString() : v)).toUpperCase();
      for (const g of genes) expect(dump.includes(g), `${g} found in ${table}`).toBe(false);
    }
  });

  it("keeps an intact hash-chained audit log and detects tampering", async () => {
    const w = new Wallets();
    const c = await createCheck(testDb, "mariam", "ahmed", "fatima");
    await w.accept("ahmed", c.id);
    await w.accept("fatima", c.id);
    await w.tickAll("ahmed", "fatima");
    const ok = await verifyAuditChain(testDb);
    expect(ok.ok).toBe(true);
    expect(ok.checked).toBeGreaterThan(5);
    const victim = await testDb.auditEvent.findFirst({ where: { action: "CONSENT_RECORDED" } });
    await testDb.auditEvent.update({ where: { id: victim!.id }, data: { actorId: "someone-else" } });
    expect((await verifyAuditChain(testDb)).ok).toBe(false);
  });
});

describe("MATCHING_MODE=trusted fallback", () => {
  beforeEach(async () => {
    vi.stubEnv("MATCHING_MODE", "trusted");
    await freshDb();
  });

  it("computes the same booleans and condition without PSI messages", async () => {
    const { decideReveal } = await import("@/server/checks");
    const c = await createCheck(testDb, "mariam", "ahmed", "fatima");
    await decideMatch(testDb, "ahmed", c.id, "ACCEPTED");
    await decideMatch(testDb, "fatima", c.id, "ACCEPTED");
    const done = (await testDb.check.findUnique({ where: { id: c.id } }))!;
    expect(done).toMatchObject({ status: "COMPLETE", sharedRisk: true });
    expect(await testDb.psiMessage.count()).toBe(0);
    await decideReveal(testDb, "ahmed", c.id, "ACCEPTED");
    await decideReveal(testDb, "fatima", c.id, "ACCEPTED");
    expect((await testDb.check.findUnique({ where: { id: c.id } }))!.revealedConditionIds).toBe('["haemoglobin-disorders"]');

    const c2 = await createCheck(testDb, "saeed", "khalid", "noura");
    await decideMatch(testDb, "khalid", c2.id, "ACCEPTED");
    await decideMatch(testDb, "noura", c2.id, "ACCEPTED");
    expect((await testDb.check.findUnique({ where: { id: c2.id } }))!.sharedRisk).toBe(false);
  });
});
