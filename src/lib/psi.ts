/**
 * Semi-honest DH-based PSI-cardinality over ristretto255 (§8).
 *
 *   H(g) = hashToRistretto255("AMANAH-v1|" + checkId + "|" + geneId)
 *
 *   P1: X = shuffle(pad({ H(g)·a }))                      → server
 *   P2: Y = shuffle({ x·b : x ∈ X }),  Z = shuffle(pad({ H(g)·b }))  → server
 *   P1: Z' = { z·a },  count = |Y ∩ Z'|,  posts only (count > 0)
 *
 * Runs in the browser (wallet) — the server only stores encoded points.
 * Every posted array has exactly PAD entries so list lengths leak nothing.
 */
import { RistrettoPoint, hash_to_ristretto255, ed25519 } from "@noble/curves/ed25519";
import { bytesToNumberLE } from "@noble/curves/abstract/utils";
import { randomBytes, utf8ToBytes } from "@noble/hashes/utils";
import { PAD } from "./config";

type Point = InstanceType<typeof RistrettoPoint>;

const ORDER = ed25519.CURVE.n;
const DST = utf8ToBytes("AMANAH-v1-PSI_ristretto255_XMD:SHA-512_R255MAP_RO_");

export function hashGene(checkId: string, gene: string): Point {
  return hash_to_ristretto255(utf8ToBytes(`AMANAH-v1|${checkId}|${gene}`), { DST });
}

export function randomScalar(): bigint {
  // 64 random bytes reduced mod the group order: negligible bias.
  let s = 0n;
  while (s === 0n) s = bytesToNumberLE(randomBytes(64)) % ORDER;
  return s;
}

const randomPoint = (): Point => hash_to_ristretto255(randomBytes(32), { DST: utf8ToBytes("AMANAH-v1-DUMMY") });
const enc = (p: Point) => p.toHex();
const dec = (h: string): Point => RistrettoPoint.fromHex(h);
const scalarToHex = (s: bigint) => s.toString(16);
const hexToScalar = (h: string) => BigInt(`0x${h}`);

export function isValidPointHex(h: unknown): boolean {
  if (typeof h !== "string" || !/^[0-9a-f]{64}$/.test(h)) return false;
  try {
    dec(h);
    return true;
  } catch {
    return false;
  }
}

export function isValidPointArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.length === PAD && a.every(isValidPointHex);
}

function randomIndex(n: number): number {
  // Rejection sampling for an unbiased index in [0, n).
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  for (;;) {
    const b = randomBytes(4);
    const v = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    if (v < limit) return v % n;
  }
}

/** Fisher–Yates with a cryptographic RNG; returns a new array. */
export function shuffle<T>(xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function padTo<T>(items: T[], filler: () => T): T[] {
  if (items.length > PAD) throw new Error(`more than ${PAD} carrier genes`);
  return [...items, ...Array.from({ length: PAD - items.length }, filler)];
}

// ---------------------------------------------------------------- protocol

export type P1State = { role: "P1"; a: string; mapping: (string | null)[] };
export type P2State = { role: "P2"; b: string };

/** Step 1 — P1 blinds its genes with a fresh scalar a. */
export function p1Start(checkId: string, genes: string[]): { X: string[]; state: P1State } {
  const a = randomScalar();
  const entries = shuffle(
    padTo<{ gene: string | null; point: Point }>(
      genes.map((g) => ({ gene: g, point: hashGene(checkId, g).multiply(a) })),
      () => ({ gene: null, point: randomPoint() }),
    ),
  );
  return {
    X: entries.map((e) => enc(e.point)),
    state: { role: "P1", a: scalarToHex(a), mapping: entries.map((e) => e.gene) },
  };
}

/** Step 2 — P2 re-blinds X (Y) and blinds its own genes (Z) with scalar b. */
export function p2Respond(
  checkId: string,
  genes: string[],
  X: string[],
): { Y: string[]; Z: string[]; state: P2State } {
  if (!isValidPointArray(X)) throw new Error("invalid X");
  const b = randomScalar();
  const Y = shuffle(X.map((x) => enc(dec(x).multiply(b))));
  const Z = shuffle(
    padTo(
      genes.map((g) => hashGene(checkId, g).multiply(b)),
      randomPoint,
    ).map(enc),
  );
  return { Y, Z, state: { role: "P2", b: scalarToHex(b) } };
}

/** Internal: intersection size seen by P1's client. Never stored or displayed. */
export function intersectionSize(state: P1State, Y: string[], Z: string[]): number {
  const a = hexToScalar(state.a);
  const zPrime = new Set(Z.map((z) => enc(dec(z).multiply(a))));
  return Y.filter((y) => zPrime.has(y)).length;
}

/** Step 3 — P1 computes only the boolean that gets posted. */
export function p1Finish(state: P1State, Y: string[], Z: string[]): boolean {
  if (!isValidPointArray(Y) || !isValidPointArray(Z)) throw new Error("invalid Y/Z");
  return intersectionSize(state, Y, Z) > 0;
}

/** Stage 2 (both consented) — P2 re-blinds X in X's original order. */
export function p2RevealOrdered(state: P2State, X: string[]): string[] {
  if (!isValidPointArray(X)) throw new Error("invalid X");
  const b = hexToScalar(state.b);
  return X.map((x) => enc(dec(x).multiply(b)));
}

/** Stage 2 — P1 maps matching indices back to its own genes. */
export function p1Reveal(state: P1State, yOrdered: string[], Z: string[]): string[] {
  if (!isValidPointArray(yOrdered) || !isValidPointArray(Z)) throw new Error("invalid input");
  const a = hexToScalar(state.a);
  const zPrime = new Set(Z.map((z) => enc(dec(z).multiply(a))));
  const genes = new Set<string>();
  yOrdered.forEach((y, i) => {
    const g = state.mapping[i];
    if (g && zPrime.has(y)) genes.add(g);
  });
  return [...genes].sort();
}
