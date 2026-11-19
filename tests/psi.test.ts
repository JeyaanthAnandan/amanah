import { describe, expect, it } from "vitest";
import {
  hashGene,
  intersectionSize,
  isValidPointArray,
  p1Finish,
  p1Reveal,
  p1Start,
  p2RevealOrdered,
  p2Respond,
} from "@/lib/psi";
import { PAD } from "@/lib/config";

function run(genes1: string[], genes2: string[], checkId = "check-1") {
  const { X, state: s1 } = p1Start(checkId, genes1);
  const { Y, Z, state: s2 } = p2Respond(checkId, genes2, X);
  return { X, Y, Z, s1, s2, shared: p1Finish(s1, Y, Z) };
}

describe("PSI (ristretto255, semi-honest)", () => {
  it("returns true when one gene is shared", () => {
    expect(run(["HBB"], ["HBB", "GJB2"]).shared).toBe(true);
  });

  it("returns false when no gene is shared", () => {
    expect(run(["CYP21A2"], ["GJB2"]).shared).toBe(false);
    expect(run([], ["GJB2"]).shared).toBe(false);
  });

  it("returns true when several genes are shared (count stays internal)", () => {
    const r = run(["HBB", "GJB2", "CFTR"], ["CFTR", "HBB", "GJB2", "SMN1"]);
    expect(r.shared).toBe(true);
    expect(intersectionSize(r.s1, r.Y, r.Z)).toBe(3);
  });

  it("pads every posted array to exactly PAD valid points", () => {
    const r = run(["HBB"], ["HBB", "GJB2"]);
    const yOrdered = p2RevealOrdered(r.s2, r.X);
    for (const arr of [r.X, r.Y, r.Z, yOrdered]) {
      expect(arr).toHaveLength(PAD);
      expect(isValidPointArray(arr)).toBe(true);
      expect(new Set(arr).size).toBe(PAD); // dummies are distinct, no visible repeats
    }
  });

  it("Stage 2 identifies the shared gene(s) and nothing else", () => {
    const r = run(["HBB"], ["HBB", "GJB2"]);
    expect(p1Reveal(r.s1, p2RevealOrdered(r.s2, r.X), r.Z)).toEqual(["HBB"]);
    const r2 = run(["GJB2", "HBB", "SMN1"], ["SMN1", "GJB2", "CFTR"]);
    expect(p1Reveal(r2.s1, p2RevealOrdered(r2.s2, r2.X), r2.Z)).toEqual(["GJB2", "SMN1"]);
  });

  it("different checkIds produce unlinkable points for the same gene", () => {
    expect(hashGene("c1", "HBB").equals(hashGene("c2", "HBB"))).toBe(false);
    const a = run(["HBB"], ["HBB"], "c1");
    const b = run(["HBB"], ["HBB"], "c2");
    expect(a.X.filter((x) => b.X.includes(x))).toHaveLength(0);
    expect(a.Z.filter((z) => b.Z.includes(z))).toHaveLength(0);
  });

  it("the same gene in the same check is blinded differently by each party", () => {
    const r = run(["HBB"], ["HBB"]);
    expect(r.X.filter((x) => r.Z.includes(x))).toHaveLength(0);
  });

  it("rejects malformed input arrays", () => {
    const { state } = p1Start("c", ["HBB"]);
    expect(() => p1Finish(state, ["00"], [])).toThrow();
    expect(() => p2Respond("c", ["HBB"], ["zz"])).toThrow();
  });
});
