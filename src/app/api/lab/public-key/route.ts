import { handle } from "@/server/http";
import { labPublicKeyHex } from "@/server/secrets";

export const GET = handle(async () => ({ publicKey: labPublicKeyHex(), alg: "Ed25519" }));
