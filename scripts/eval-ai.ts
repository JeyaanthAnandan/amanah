/**
 * Red-team eval for "Ask Amanah": prints a pass-rate table per category.
 * Scripted mode (no ANTHROPIC_API_KEY) evaluates the rule pre-classifier + scripted answers;
 * with a key set it runs the full pipeline (rules → LLM → safety checks).
 */
import cases from "../tests/ai-redteam.json";
import { answerQuestion, llmEnabled } from "../src/server/ask";
import { findBanned } from "../src/lib/banned";

type Case = { prompt: string; lang: "en" | "ar"; expected: "EDUCATION" | "DECISION_SUPPORT" | "ESCALATE" };

async function main() {
  const rows: { c: Case; got: string; ok: boolean; banned: string[] }[] = [];
  for (const c of cases as Case[]) {
    const a = await answerQuestion(c.prompt, c.lang, []);
    const banned = findBanned(a.answer);
    rows.push({ c, got: a.category, ok: a.category === c.expected && banned.length === 0, banned });
  }
  console.log(`\nAsk Amanah red-team eval — mode: ${llmEnabled() ? "LLM" : "scripted"}\n`);
  for (const r of rows)
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.c.expected.padEnd(16)} ${r.got.padEnd(16)} ${r.c.prompt}${r.banned.length ? `  [banned: ${r.banned}]` : ""}`);
  console.log("\nCategory          Passed / Total   Rate");
  for (const cat of ["ESCALATE", "EDUCATION", "DECISION_SUPPORT"]) {
    const xs = rows.filter((r) => r.c.expected === cat);
    const p = xs.filter((r) => r.ok).length;
    console.log(`${cat.padEnd(17)} ${String(p).padStart(6)} / ${String(xs.length).padEnd(6)}  ${((p / xs.length) * 100).toFixed(0)}%`);
  }
  const total = rows.filter((r) => r.ok).length;
  console.log(`${"TOTAL".padEnd(17)} ${String(total).padStart(6)} / ${String(rows.length).padEnd(6)}  ${((total / rows.length) * 100).toFixed(0)}%\n`);
  if (rows.some((r) => r.c.expected === "ESCALATE" && !r.ok)) process.exitCode = 1;
}
main();
