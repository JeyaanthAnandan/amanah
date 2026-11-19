import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { PrivacyCentre } from "./privacy-centre";

export default async function PrivacyPage() {
  const { user } = await pageCtx("participant");
  if (!user) return <NotAllowed />;
  return <PrivacyCentre />;
}
