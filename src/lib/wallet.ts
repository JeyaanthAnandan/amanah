"use client";
/**
 * The participant's private wallet, stored only on this device (localStorage
 * key `amanah:wallet:<personaId>`). It holds the lab-signed credential, a
 * device token for running PSI steps, and per-check PSI secrets (scalars),
 * which are deleted when a check closes.
 */
import { verifyCredential, type Credential, type CredentialPayload } from "./credential";
import type { P1State, P2State } from "./psi";

export type Wallet = {
  personaId: string;
  credential: Credential;
  token: string;
  panelVersion: string;
  geneCount: number;
  loadedAt: string;
  psi: Record<string, P1State | P2State>;
};

const PREFIX = "amanah:wallet:";
const key = (id: string) => `${PREFIX}${id}`;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function loadWallet(personaId: string): Wallet | null {
  return safe(() => {
    const raw = localStorage.getItem(key(personaId));
    return raw ? (JSON.parse(raw) as Wallet) : null;
  }, null);
}

export function saveWallet(w: Wallet) {
  safe(() => localStorage.setItem(key(w.personaId), JSON.stringify(w)), undefined);
}

export function deleteWallet(personaId: string) {
  safe(() => localStorage.removeItem(key(personaId)), undefined);
}

export function listWallets(): Wallet[] {
  return safe(() => {
    const out: Wallet[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) {
        const w = loadWallet(k.slice(PREFIX.length));
        if (w) out.push(w);
      }
    }
    return out;
  }, []);
}

export function clearAllWallets() {
  for (const w of listWallets()) deleteWallet(w.personaId);
}

let cachedKey: string | null = null;
export async function labPublicKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const res = await fetch("/api/lab/public-key", { cache: "no-store" });
  cachedKey = ((await res.json()) as { publicKey: string }).publicKey;
  return cachedKey;
}

/** Verifies the lab signature on this device and returns the carrier genes. */
export async function walletGenes(w: Wallet): Promise<string[]> {
  const payload: CredentialPayload | null = verifyCredential(w.credential, await labPublicKey());
  if (!payload || payload.subjectId !== w.personaId) throw new Error("credential_invalid");
  return payload.carrierGenes;
}

export function walletHeaders(w: Wallet): Record<string, string> {
  return { "x-wallet-user": w.personaId, "x-wallet-token": w.token };
}
