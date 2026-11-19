import { pageCtx } from "@/server/page";
import { FAQ } from "@/lib/ask-rules";
import { Card } from "@/components/ui/card";
import { AskAmanah } from "@/components/ask-amanah";

export default async function LearnPage() {
  const { t, lang } = await pageCtx();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.learn.title}</h1>
      <Card>
        <h2 className="mb-3 text-lg font-bold">{t.ask.title}</h2>
        <AskAmanah conditionIds={[]} />
      </Card>
      <div className="space-y-2">
        {FAQ.map((f) => (
          <details key={f.id} className="rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer font-semibold">{lang === "ar" ? f.q_ar : f.q_en}</summary>
            <p className="mt-2 leading-relaxed">{lang === "ar" ? f.a_ar : f.a_en}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
