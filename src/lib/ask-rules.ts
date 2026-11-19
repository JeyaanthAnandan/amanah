/**
 * "Ask Amanah" — rule-based pre-classifier and scripted answers (§7).
 * Pure and dependency-free so it runs in tests and `npm run eval:ai`.
 */
import faqRaw from "../../content/faq.json";

export type Category = "EDUCATION" | "DECISION_SUPPORT" | "ESCALATE";
export type Faq = { id: string; keywords: string[]; q_en: string; a_en: string; q_ar: string; a_ar: string };
export const FAQ = faqRaw as Faq[];

const DISTRESS = [
  "worried", "scared", "afraid", "anxious", "panic", "hopeless", "can't cope", "cannot cope", "crying", "cry", "depressed",
  "suicide", "suicidal", "kill myself", "end my life", "devastated", "terrified", "can't sleep", "overwhelmed",
  "قلق", "خائف", "خائفة", "خوف", "يائس", "يائسة", "اكتئاب", "أبكي", "انتحار", "منهار", "منهارة", "لا أستطيع النوم",
];
const DECISION = [
  "should we marry", "should i marry", "should we get married", "should i get married", "marry him", "marry her",
  "cancel the wedding", "cancel the engagement", "call off", "break off", "break up", "go ahead with the marriage",
  "is it okay to marry", "can we still marry", "still get married", "should we cancel", "should i cancel", "leave him", "leave her",
  "هل نتزوج", "هل أتزوج", "نلغي الزواج", "إلغاء الخطبة", "فسخ الخطبة", "إلغاء الزواج", "أتركه", "أتركها", "نكمل الزواج",
];
const RELIGION = ["halal", "haram", "fatwa", "islam", "religion", "religious", "sharia", "imam", "sheikh", "allowed in islam", "حلال", "حرام", "فتوى", "الشرع", "شرعا", "شرعًا", "الدين", "الإسلام"];
const TERMINATION = ["abortion", "terminate", "termination", "end the pregnancy", "إجهاض", "إنهاء الحمل"];
const PREGNANT = ["i am pregnant", "i'm pregnant", "we are pregnant", "my wife is pregnant", "currently pregnant", "she is pregnant", "weeks pregnant", "أنا حامل", "زوجتي حامل", "حامل الآن"];
const TREATMENT = ["medication", "medicine for me", "what dose", "dosage", "should i take", "which treatment should", "دواء", "جرعة"];
const OPTIONS = ["option", "options", "what can we do", "choices", "alternatives", "what now", "next steps", "خيارات", "ماذا نفعل", "البدائل"];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Latin phrases match on word boundaries ("cry" must not match "encryption"); Arabic by substring. */
const has = (q: string, words: string[]) =>
  words.some((w) => (/^[a-z0-9'\s-]+$/.test(w) ? new RegExp(`\\b${escapeRe(w)}\\b`).test(q) : q.includes(w)));

// "should we get married", "whether to cancel the wedding", "marry him or not", ...
const MARRIAGE_DECISION_RE =
  /\b(should|shall|whether|must|ought|better|okay|ok)\b[^.?!]{0,40}\b(marry|married|marriage|wedding|engagement|engaged|cancel|proceed)\b|\b(marry|marriage|wedding|engagement)\b[^.?!]{0,30}\bor not\b/;
const INJECTION_RE = /\b(ignore|disregard|forget)\b[^.?!]{0,30}\b(rules|instructions|prompt)\b/;

export type RuleResult = { category: Category; distress: boolean; reason: string };

export function ruleClassify(question: string): RuleResult {
  const q = ` ${question.toLowerCase().replace(/\s+/g, " ")} `;
  if (has(q, DISTRESS)) return { category: "ESCALATE", distress: true, reason: "distress" };
  if (has(q, DECISION) || MARRIAGE_DECISION_RE.test(q)) return { category: "ESCALATE", distress: false, reason: "marriage_decision" };
  if (INJECTION_RE.test(q)) return { category: "ESCALATE", distress: false, reason: "uncertain" };
  if (has(q, RELIGION)) return { category: "ESCALATE", distress: false, reason: "religious_ruling" };
  if (has(q, TERMINATION)) return { category: "ESCALATE", distress: false, reason: "termination" };
  if (has(q, PREGNANT)) return { category: "ESCALATE", distress: false, reason: "pregnancy_specific" };
  if (has(q, TREATMENT)) return { category: "ESCALATE", distress: false, reason: "treatment_decision" };
  if (has(q, OPTIONS)) return { category: "DECISION_SUPPORT", distress: false, reason: "options" };
  return { category: "EDUCATION", distress: false, reason: "default" };
}

/** Strip anything that looks like a phone number, Emirates ID or email before any external call. */
export function redact(text: string): string {
  return text
    .replace(/784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d/g, "[id]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\+?\d[\d\s-]{6,}\d/g, "[number]")
    .slice(0, 500);
}

const tokens = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);

export function bestFaq(question: string): { faq: Faq; score: number } | null {
  const q = question.toLowerCase();
  const qt = new Set(tokens(question));
  let best: { faq: Faq; score: number } | null = null;
  for (const f of FAQ) {
    let score = 0;
    for (const k of f.keywords) if (q.includes(k.toLowerCase())) score += k.includes(" ") ? 3 : 2;
    for (const w of tokens(`${f.q_en} ${f.q_ar}`)) if (qt.has(w)) score += 1;
    if (!best || score > best.score) best = { faq: f, score };
  }
  return best && best.score >= 2 ? best : null;
}
