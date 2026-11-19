import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { Inbox } from "./inbox";

export default async function InboxPage() {
  const { user, t } = await pageCtx();
  if (!user) return <NotAllowed />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.inbox.title}</h1>
      <Inbox />
    </div>
  );
}
