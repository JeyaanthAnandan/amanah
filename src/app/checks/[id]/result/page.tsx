import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { ResultView } from "./result-view";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await pageCtx("participant");
  if (!user) return <NotAllowed />;
  return <ResultView id={(await params).id} />;
}
