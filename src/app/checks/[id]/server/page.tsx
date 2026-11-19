import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { ServerView } from "./server-view";

export default async function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await pageCtx("participant");
  if (!user) return <NotAllowed />;
  return <ServerView id={(await params).id} />;
}
