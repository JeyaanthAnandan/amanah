"use client";
import { useI18n } from "./providers";
import { Badge } from "./ui/badge";
import { conditionById } from "@/lib/conditions";
import { ExternalLink } from "lucide-react";

export function ConditionCard({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const c = conditionById(id);
  if (!c) return null;
  const ar = lang === "ar";
  return (
    <article className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold">{ar ? c.name_ar : c.name_en}</h3>
        <Badge variant="outline" dir="ltr">{c.gene}</Badge>
        <Badge variant="demo" title={c.reviewStatus}>{t.common.demoContent}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t.condition.inheritance}: {t.condition.autosomalRecessive}</p>
      <h4 className="mt-3 font-semibold">{t.condition.about}</h4>
      <p className="mt-1 leading-relaxed">{ar ? c.summary_ar : c.summary_en}</p>
      <h4 className="mt-3 font-semibold">{t.condition.living}</h4>
      <p className="mt-1 leading-relaxed">{ar ? c.living_with_ar : c.living_with_en}</p>
      <h4 className="mt-3 font-semibold">{t.condition.treatment}</h4>
      <p className="mt-1 leading-relaxed">{ar ? c.treatment_ar : c.treatment_en}</p>
      <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary underline">
        {t.condition.source}: MedlinePlus Genetics <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </article>
  );
}

export function conditionSpeech(id: string, lang: "en" | "ar") {
  const c = conditionById(id);
  if (!c) return "";
  return lang === "ar" ? `${c.name_ar}. ${c.summary_ar} ${c.living_with_ar} ${c.treatment_ar}` : `${c.name_en}. ${c.summary_en} ${c.living_with_en} ${c.treatment_en}`;
}
