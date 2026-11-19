import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { Console } from "./console";

export default async function CounsellorPage() {
  const { user } = await pageCtx("counsellor");
  if (!user) return <NotAllowed />;
  return <Console />;
}
