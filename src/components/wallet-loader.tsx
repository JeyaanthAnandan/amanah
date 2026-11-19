"use client";
import * as React from "react";
import { useI18n } from "./providers";
import { Button } from "./ui/button";
import { Card, CardText, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { api } from "@/lib/api";
import { deleteWallet, loadWallet, saveWallet, walletGenes, type Wallet } from "@/lib/wallet";
import type { Credential } from "@/lib/credential";
import { PANEL_VERSION } from "@/lib/config";
import { fmt } from "@/i18n";
import { Lock, ShieldCheck, Smartphone } from "lucide-react";

export function useWallet(personaId: string | undefined) {
  const [wallet, setWallet] = React.useState<Wallet | null | undefined>(undefined);
  React.useEffect(() => {
    setWallet(personaId ? loadWallet(personaId) : null);
  }, [personaId]);
  return [wallet, setWallet] as const;
}

/** Loads the lab-signed credential into this device's wallet after verifying the signature. */
export function WalletLoader({ onLoaded, compact = false }: { onLoaded?: (w: Wallet) => void; compact?: boolean }) {
  const { t, user } = useI18n();
  const [wallet, setWallet] = useWallet(user?.id);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [deleted, setDeleted] = React.useState(false);

  async function load() {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ credential: Credential; walletToken: string; geneCount: number }>("/api/lab/issue", {});
      const w: Wallet = {
        personaId: user.id, credential: r.credential, token: r.walletToken, panelVersion: PANEL_VERSION,
        geneCount: r.geneCount, loadedAt: new Date().toISOString(), psi: loadWallet(user.id)?.psi ?? {},
      };
      await walletGenes(w); // verify the Ed25519 signature on this device before storing
      saveWallet(w);
      setWallet(w);
      setDeleted(false);
      onLoaded?.(w);
    } catch {
      setErr(t.wallet.verifyFailed);
    } finally {
      setBusy(false);
    }
  }

  if (wallet === undefined) return null;
  if (!wallet)
    return (
      <Card className={compact ? "border-dashed" : ""}>
        <div className="flex gap-3">
          <Smartphone className="size-6 shrink-0 text-primary" aria-hidden />
          <div>
            <CardTitle className="text-base">{t.wallet.loadPrompt}</CardTitle>
            <CardText>{t.wallet.deviceNote}</CardText>
            {deleted && <p className="mt-2 text-sm">{t.wallet.deleted}</p>}
            <Button onClick={load} disabled={busy} className="mt-3">{busy ? t.common.loading : t.wallet.loadButton}</Button>
            {err && <p role="alert" className="mt-2 text-sm text-amber">{err}</p>}
          </div>
        </div>
      </Card>
    );

  return (
    <Card>
      <div className="flex gap-3">
        <ShieldCheck className="size-6 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <CardTitle className="text-base">{fmt(t.wallet.loaded, { panel: wallet.panelVersion, count: wallet.geneCount })}</CardTitle>
          <CardText className="flex items-start gap-1"><Lock className="mt-1 size-4 shrink-0" aria-hidden />{t.wallet.deviceNote}</CardText>
          {!compact && (
            <>
              <CardText>{t.wallet.verified}</CardText>
              <CardText>{t.wallet.rightNotToKnow}</CardText>
              <Badge variant="demo" className="mt-2">{t.wallet.source}</Badge>
              <div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    deleteWallet(wallet.personaId);
                    setWallet(null);
                    setDeleted(true);
                  }}
                >
                  {t.wallet.deleteButton}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
