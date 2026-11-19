import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { db } from "@/lib/db";
import { StartForm } from "./start-form";

export default async function StartPage() {
  const { user, t } = await pageCtx("family_initiator");
  if (!user) return <NotAllowed />;
  const me = await db.user.findUnique({ where: { id: user.id } });
  const participants = (await db.user.findMany({ where: { simulated: false } }))
    .filter((u) => u.roles.includes("participant"))
    .map((u) => ({ id: u.id, name: u.name, nameAr: u.nameAr }));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.start.title}</h1>
      <StartForm participants={participants} defaultA={me?.relatedTo ?? ""} />
    </div>
  );
}
