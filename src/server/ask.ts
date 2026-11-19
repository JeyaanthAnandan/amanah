import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getDict, type Lang } from "@/i18n";
import { FAQ, bestFaq, redact, ruleClassify, type Category } from "@/lib/ask-rules";
import { findBanned } from "@/lib/banned";
import { conditionById } from "@/lib/conditions";
import { ASK_SYSTEM_PROMPT } from "./ask-prompt";

export type AskAnswer = { category: Category; answer: string; distress: boolean; source: "scripted" | "llm" };

export const llmEnabled = () => !!process.env.ANTHROPIC_API_KEY;

function scripted(question: string, lang: Lang, category: Category, distress: boolean): AskAnswer {
  const t = getDict(lang);
  if (category === "ESCALATE") return { category, distress, answer: distress ? t.ask.distress : t.ask.escalate, source: "scripted" };
  if (category === "DECISION_SUPPORT") {
    const opts = t.explain.options.map((o) => `• ${o.title}: ${o.body}`).join("\n");
    return { category, distress, answer: `${t.explain.optionsIntro}\n${opts}\n${t.explain.optionsFooter}`, source: "scripted" };
  }
  const hit = bestFaq(question);
  return { category, distress, answer: hit ? (lang === "ar" ? hit.faq.a_ar : hit.faq.a_en) : t.ask.notSure, source: "scripted" };
}

function sources(lang: Lang, conditionIds: string[]) {
  const t = getDict(lang);
  const faq = FAQ.map((f) => (lang === "ar" ? `Q: ${f.q_ar}\nA: ${f.a_ar}` : `Q: ${f.q_en}\nA: ${f.a_en}`)).join("\n\n");
  const options = t.explain.options.map((o) => `- ${o.title}: ${o.body}`).join("\n") + `\n${t.explain.optionsFooter}`;
  // Only the generic condition card — never names, IDs or wallet contents.
  const cards = conditionIds
    .map((id) => conditionById(id))
    .filter((c) => !!c)
    .map((c) => `${c!.name_en}: ${c!.summary_en} ${c!.living_with_en} ${c!.treatment_en}`)
    .join("\n");
  return `FAQ:\n${faq}\n\nOPTIONS:\n${options}${cards ? `\n\nCONDITION CARD:\n${cards}` : ""}`;
}

async function llm(question: string, lang: Lang, conditionIds: string[]): Promise<{ category: Category; answer: string } | null> {
  const client = new Anthropic();
  const res = await client.beta.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    max_tokens: 1024,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["EDUCATION", "DECISION_SUPPORT", "ESCALATE"] },
            answer: { type: "string" },
          },
          required: ["category", "answer"],
          additionalProperties: false,
        },
      },
    },
    system: [
      { type: "text", text: ASK_SYSTEM_PROMPT },
      { type: "text", text: `SOURCES:\n${sources(lang, conditionIds)}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: `UI language: ${lang === "ar" ? "Arabic" : "English"}\nQuestion: ${redact(question)}` }],
  });
  if (res.stop_reason === "refusal") return { category: "ESCALATE", answer: "" };
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  const parsed = JSON.parse(text.text) as { category: Category; answer: string };
  return parsed;
}

/** Pipeline: rule pre-classifier → (optional) LLM → safety post-checks → scripted fallback. */
export async function answerQuestion(question: string, lang: Lang, conditionIds: string[]): Promise<AskAnswer> {
  const rule = ruleClassify(question);
  if (rule.category === "ESCALATE" || !llmEnabled()) return scripted(question, lang, rule.category, rule.distress);
  try {
    const out = await llm(question, lang, conditionIds);
    if (!out) return scripted(question, lang, rule.category, false);
    if (out.category === "ESCALATE") return scripted(question, lang, "ESCALATE", false);
    const words = out.answer.trim().split(/\s+/);
    if (!out.answer.trim() || findBanned(out.answer).length) return scripted(question, lang, out.category, false);
    return { category: out.category, distress: false, answer: words.slice(0, 120).join(" "), source: "llm" };
  } catch (e) {
    console.warn("Ask Amanah LLM failed; using scripted fallback", e instanceof Anthropic.APIError ? e.status : e);
    return scripted(question, lang, rule.category, false);
  }
}

export { scripted as scriptedAnswer };
