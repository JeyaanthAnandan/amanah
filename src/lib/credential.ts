// Shared (browser + server) helpers for the lab-signed carrier credential.
import { ed25519 } from "@noble/curves/ed25519";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";

export type CredentialPayload = {
  subjectId: string;
  carrierGenes: string[];
  panelVersion: string;
  issuedAt: string;
};

/** The exact signed bytes are `payloadJson`, so verification never depends on key order. */
export type Credential = { payloadJson: string; signature: string };

export function signPayload(payload: CredentialPayload, secretKey: Uint8Array): Credential {
  const payloadJson = JSON.stringify(payload);
  const signature = bytesToHex(ed25519.sign(utf8ToBytes(payloadJson), secretKey));
  return { payloadJson, signature };
}

export function verifyCredential(
  cred: Credential,
  publicKeyHex: string,
): CredentialPayload | null {
  try {
    const ok = ed25519.verify(
      hexToBytes(cred.signature),
      utf8ToBytes(cred.payloadJson),
      hexToBytes(publicKeyHex),
    );
    return ok ? (JSON.parse(cred.payloadJson) as CredentialPayload) : null;
  } catch {
    return null;
  }
}
