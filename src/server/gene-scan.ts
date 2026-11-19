import type { PrismaClient } from "@prisma/client";
import { GENES } from "@/lib/conditions";

/** Counts gene-symbol occurrences in every app table except the simulated lab record. */
export async function scanForGenes(db: PrismaClient): Promise<{ tables: number; hits: { table: string; gene: string }[] }> {
  const tables = (await db.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite%'",
  )).map((t) => t.name).filter((t) => t !== "LabRecord");
  const hits: { table: string; gene: string }[] = [];
  for (const table of tables) {
    const rows = await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${table}"`);
    const dump = JSON.stringify(rows, (_k, v) => (typeof v === "bigint" ? v.toString() : v)).toUpperCase();
    for (const g of GENES) if (dump.includes(g)) hits.push({ table, gene: g });
  }
  return { tables: tables.length, hits };
}
