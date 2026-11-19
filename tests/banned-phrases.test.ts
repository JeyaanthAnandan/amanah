import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { findBanned, BANNED_EN, BANNED_AR } from "@/lib/banned";
import { ASK_SYSTEM_PROMPT } from "@/server/ask-prompt";
import { en } from "@/i18n/en";
import { ar } from "@/i18n/ar";

const root = path.resolve(__dirname, "..");

function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}

describe("§6.1 banned phrases", () => {
  it("lists English and Arabic equivalents", () => {
    expect(BANNED_EN).toHaveLength(12);
    expect(BANNED_AR.length).toBeGreaterThanOrEqual(12);
  });

  it("detects phrases case-insensitively", () => {
    expect(findBanned("You Should cancel")).toContain("you should");
    expect(findBanned("هذا زواج خطير")).toContain("زواج خطير");
  });

  it("no UI copy in src/i18n/* uses a banned phrase", () => {
    for (const file of readdirSync(path.join(root, "src/i18n"))) {
      const src = readFileSync(path.join(root, "src/i18n", file), "utf8");
      expect(findBanned(src), file).toEqual([]);
    }
    for (const s of [...strings(en), ...strings(ar)]) expect(findBanned(s), s).toEqual([]);
  });

  it("no content file or AI system prompt uses a banned phrase", () => {
    for (const file of ["content/conditions.json", "content/faq.json"])
      expect(findBanned(readFileSync(path.join(root, file), "utf8")), file).toEqual([]);
    expect(findBanned(ASK_SYSTEM_PROMPT)).toEqual([]);
  });
});
