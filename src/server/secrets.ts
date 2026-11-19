import "server-only";
import { sha256 } from "@noble/hashes/sha2";
import { hmac } from "@noble/hashes/hmac";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";
import { ed25519 } from "@noble/curves/ed25519";

// DEMO ONLY: keys are derived from fixed strings unless env overrides are set.
// Production: keys live in an HSM / Key Vault in a UAE region (see docs).
const labSecret = () =>
  process.env.LAB_ISSUER_SECRET
    ? hexToBytes(process.env.LAB_ISSUER_SECRET)
    : sha256(utf8ToBytes("amanah-demo-lab-issuer-key-v1"));

const appSecret = () =>
  utf8ToBytes(process.env.APP_SECRET ?? "amanah-demo-app-secret-v1");

export const labSecretKey = () => labSecret();
export const labPublicKeyHex = () => bytesToHex(ed25519.getPublicKey(labSecret()));

/** Device credential so a wallet can run its PSI steps without the user's session. */
export const walletToken = (userId: string) =>
  bytesToHex(hmac(sha256, appSecret(), utf8ToBytes(`wallet|${userId}`)));

export function checkWalletToken(userId: string, token: string | null): boolean {
  if (!token) return false;
  const expected = walletToken(userId);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
