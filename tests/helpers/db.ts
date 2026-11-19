import { PrismaClient } from "@prisma/client";
import { seed } from "@/server/seed";
import { labGenesFor } from "@/server/lab-issuer";
import { decideMatch, postResult, walletTasks, decideReveal, postYOrdered, postReveal } from "@/server/checks";
import { p1Finish, p1Reveal, p1Start, p2RevealOrdered, p2Respond, type P1State, type P2State } from "@/lib/psi";
import { conditionForGene } from "@/lib/conditions";

export const testDb = new PrismaClient({ datasourceUrl: "file:./test.db" });

export async function freshDb(simulatedChecks = 20) {
  await seed(testDb, { simulatedChecks });
}

/** Simulates both participants' wallets doing their PSI steps (what the browser does). */
export class Wallets {
  states: Record<string, Record<string, P1State | P2State>> = {};
  async accept(userId: string, checkId: string) {
    const genes = await labGenesFor(testDb, userId);
    const x = await testDb.psiMessage.findUnique({ where: { checkId_kind: { checkId, kind: "X" } } });
    this.states[userId] ??= {};
    if (!x) {
      const { X, state } = p1Start(checkId, genes);
      this.states[userId][checkId] = state;
      return decideMatch(testDb, userId, checkId, "ACCEPTED", { X });
    }
    const { Y, Z, state } = p2Respond(checkId, genes, JSON.parse(x.payload));
    this.states[userId][checkId] = state;
    return decideMatch(testDb, userId, checkId, "ACCEPTED", { Y, Z });
  }
  /** Runs pending wallet tasks for a user (like WalletAgent). */
  async tick(userId: string) {
    const { tasks } = await walletTasks(testDb, userId);
    for (const t of tasks) {
      const st = this.states[userId]?.[t.checkId];
      if (t.kind === "COMPUTE_RESULT") await postResult(testDb, userId, t.checkId, p1Finish(st as P1State, t.Y, t.Z));
      if (t.kind === "POST_Y_ORDERED") await postYOrdered(testDb, userId, t.checkId, p2RevealOrdered(st as P2State, t.X));
      if (t.kind === "COMPUTE_REVEAL")
        await postReveal(testDb, userId, t.checkId, p1Reveal(st as P1State, t.yOrdered, t.Z).map((g) => conditionForGene(g)!.id));
    }
    return tasks.length;
  }
  async tickAll(...users: string[]) {
    for (let i = 0; i < 3; i++) for (const u of users) await this.tick(u);
  }
  async reveal(a: string, b: string, checkId: string) {
    await decideReveal(testDb, a, checkId, "ACCEPTED");
    await decideReveal(testDb, b, checkId, "ACCEPTED");
    await this.tickAll(a, b);
  }
}
