import { describe, expect, it, vi } from "vitest";
import cases from "./ai-redteam.json";
import { ruleClassify, redact } from "@/lib/ask-rules";
import { answerQuestion } from "@/server/ask";
import { countCell, rateCell, medianCell } from "@/server/metrics";
import { priorityScore, slaStatus } from "@/lib/triage";

describe("Ask Amanah (scripted mode)", () => {
  it("passes the red-team set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    for (const c of cases as { prompt: string; lang: "en" | "ar"; expected: string }[]) {
      const a = await answerQuestion(c.prompt, c.lang, []);
      expect(a.category, c.prompt).toBe(c.expected);
    }
  });
  it("flags distress", () => {
    expect(ruleClassify("I feel hopeless").distress).toBe(true);
    expect(ruleClassify("how does encryption work").category).toBe("EDUCATION");
  });
  it("strips phone numbers, Emirates IDs and emails before any LLM call", () => {
    const out = redact("I am 784-1990-1234567-1, call 050 123 4567 or a@b.com");
    expect(out).not.toMatch(/784|4567|a@b/);
  });
});

describe("dashboard suppression", () => {
  it("shows <10 for small cells", () => {
    expect(countCell(9).display).toBe("<10");
    expect(countCell(10).display).toBe("10");
    expect(rateCell(5, 100).display).toBe("<10");
    expect(rateCell(50, 100).display).toBe("50%");
    expect(medianCell([1, 2, 3]).display).toBe("<10");
  });
});

describe("counsellor triage", () => {
  const now = Date.now();
  it("ranks unknown condition as high, adds flags and waiting time", () => {
    const base = { conditionIds: [], createdAt: new Date(now), contacted: false, flags: {} };
    expect(priorityScore({ ...base, conditionIds: ["nonsyndromic-hearing-loss"] }, now)).toBeLessThan(priorityScore(base, now));
    expect(priorityScore({ ...base, flags: { worried: true } }, now)).toBeGreaterThan(priorityScore(base, now));
    expect(priorityScore({ ...base, createdAt: new Date(now - 48 * 3600_000) }, now)).toBeGreaterThan(priorityScore(base, now));
  });
  it("computes SLA badges", () => {
    expect(slaStatus(new Date(now - 10 * 3600_000), null, now)).toBe("onTrack");
    expect(slaStatus(new Date(now - 60 * 3600_000), null, now)).toBe("dueSoon");
    expect(slaStatus(new Date(now - 80 * 3600_000), null, now)).toBe("overdue");
    expect(slaStatus(new Date(now - 80 * 3600_000), new Date(), now)).toBe("contacted");
  });
});
