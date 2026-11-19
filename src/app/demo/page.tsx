import { pageCtx } from "@/server/page";
import { Card, CardText } from "@/components/ui/card";
import { matchingMode, demoFast } from "@/lib/config";
import { fmt } from "@/i18n";
import { DemoChecklist } from "./demo-checklist";

export default async function DemoPage() {
  const { t } = await pageCtx();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.demoPage.title}</h1>
      <CardText className="mt-0">{t.demoPage.intro}</CardText>
      <Card className="text-sm">{fmt(t.demoPage.env, { mode: matchingMode(), fast: demoFast() ? "on (3 min)" : "off (7 days)" })}</Card>
      <DemoChecklist />
    </div>
  );
}
