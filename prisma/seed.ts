import { PrismaClient } from "@prisma/client";
import { seed } from "../src/server/seed";

const db = new PrismaClient();
seed(db)
  .then(async () => {
    console.log("Seeded demo personas + 400 simulated checks.");
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
