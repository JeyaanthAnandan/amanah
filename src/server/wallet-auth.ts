import "server-only";
import { HttpError } from "./http-error";
import { checkWalletToken } from "./secrets";

/** Wallet (device) authentication: lets a wallet on this device run its PSI steps. */
export function requireWallet(req: Request): string {
  const userId = req.headers.get("x-wallet-user");
  if (!userId || !checkWalletToken(userId, req.headers.get("x-wallet-token"))) throw new HttpError(401, "bad_wallet_token");
  return userId;
}
