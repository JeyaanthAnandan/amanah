import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { CheckList } from "./check-list";

export default async function ChecksPage() {
  const { user, t } = await pageCtx("family_initiator", "participant");
  if (!user) return <NotAllowed />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.checks.title}</h1>
      <CheckList />
    </div>
  );
}
