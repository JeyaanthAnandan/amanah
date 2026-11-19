import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { dashboardMetrics } from "@/server/metrics";

export const GET = handle(async () => {
  await requireUser("doh_analyst");
  return dashboardMetrics(db);
});
