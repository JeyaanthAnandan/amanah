import { db } from "@/lib/db";
import { handle } from "@/server/http";
import { walletTasks } from "@/server/checks";
import { requireWallet } from "@/server/wallet-auth";

export const GET = handle(async (req: Request) => walletTasks(db, requireWallet(req)));
