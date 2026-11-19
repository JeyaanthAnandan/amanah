import "server-only";
/**
 * MATCHING_MODE=trusted fallback (§8.4). An isolated module that reads the
 * simulated lab system directly and returns ONLY a boolean (match) or the
 * condition ids (Stage 2, after both consent). Same interface as PSI from the
 * app's point of view: nothing but the boolean / condition ids is persisted.
 */
import type { PrismaClient } from "@prisma/client";
import { labGenesFor } from "./lab-issuer";
import { conditionForGene } from "@/lib/conditions";

async function intersection(db: PrismaClient, u1: string, u2: string) {
  const [g1, g2] = await Promise.all([labGenesFor(db, u1), labGenesFor(db, u2)]);
  const s2 = new Set(g2);
  return g1.filter((g) => s2.has(g));
}

export async function trustedMatch(db: PrismaClient, u1: string, u2: string): Promise<boolean> {
  return (await intersection(db, u1, u2)).length > 0;
}

export async function trustedReveal(db: PrismaClient, u1: string, u2: string): Promise<string[]> {
  return (await intersection(db, u1, u2))
    .map((g) => conditionForGene(g)?.id)
    .filter((x): x is string => !!x);
}
