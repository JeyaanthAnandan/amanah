import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { matchingMode, demoFast } from "@/lib/config";
import { CheckDetail } from "./check-detail";

export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await pageCtx();
  if (!user) return <NotAllowed />;
  return <CheckDetail id={(await params).id} mode={matchingMode()} fast={demoFast()} />;
}
