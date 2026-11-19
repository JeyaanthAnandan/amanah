import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { FamilyView } from "./family-view";

export default async function FamilyPage() {
  const { user, t } = await pageCtx("family_member");
  if (!user) return <NotAllowed />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.family.title}</h1>
      <FamilyView />
    </div>
  );
}
