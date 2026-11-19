"use client";
import Link from "next/link";
import * as React from "react";
import { useI18n } from "@/components/providers";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WalletLoader, useWallet } from "@/components/wallet-loader";
import { formatDuration, useNow } from "@/components/time-left";
import { usePoll, signalRefresh } from "@/lib/use-poll";
import { api } from "@/lib/api";
import { loadWallet, saveWallet, walletGenes } from "@/lib/wallet";
import { p1Start, p2Respond } from "@/lib/psi";
import type { CheckView, ParticipantView } from "@/server/views";
import { CheckCircle2, Clock, Info, Lock, ShieldQuestion } from "lucide-react";

export function CheckDetail({ id, mode, fast }: { id: string; mode: "psi" | "trusted"; fast: boolean }) {
  const { t, fmt, nameOf, lang } = useI18n();
  const { data, error, reload } = usePoll<CheckView>(`/api/checks/${id}`);
  const now = useNow();
  if (error) return <Card><CardText className="mt-0">{t.common.notAllowed}</CardText></Card>;
  if (!data) return <p>{t.common.loading}</p>;

  const left = formatDuration(new Date(data.expiresAt).getTime() - now, lang);
  const windowLabel = fast ? t.checks.window3m : t.checks.window7d;

  if (data.kind === "requester") {
    return (
      <Card>
        <CardTitle>{fmt(t.checks.between, { p1: nameOf(data.p1), p2: nameOf(data.p2) })}</CardTitle>
        {data.status === "WAITING" && (
          <div className="mt-3 flex gap-2">
            <Clock className="size-5 shrink-0 text-sand-strong" aria-hidden />
            <div>
              <p className="font-semibold">{t.checks.waiting}</p>
              <CardText className="mt-1">{fmt(t.checks.waitingHelp, { window: windowLabel })}</CardText>
              <p className="mt-1 text-sm text-muted-foreground">{fmt(t.checks.expiresIn, { time: left })}</p>
            </div>
          </div>
        )}
        {data.status === "COMPLETE" && (
          <p className="mt-3 flex gap-2 font-semibold text-primary">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            {fmt(t.checks.complete, { p1: nameOf(data.p1), p2: nameOf(data.p2) })}
          </p>
        )}
        {data.status === "NOT_COMPLETED" && (
          <div className="mt-3">
            <p className="font-semibold">{t.checks.notCompleted}</p>
            <CardText className="mt-1">{t.checks.notCompletedHelp}</CardText>
          </div>
        )}
      </Card>
    );
  }

  return <ParticipantDetail v={data} mode={mode} left={left} reload={reload} />;
}

function ParticipantDetail({ v, mode, left, reload }: { v: ParticipantView; mode: "psi" | "trusted"; left: string; reload: () => void }) {
  const { t, fmt, nameOf, user } = useI18n();
  const [wallet, setWallet] = useWallet(user?.id);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const vars = { requester: nameOf(v.requester), other: nameOf(v.other) };

  async function decide(decision: "ACCEPTED" | "DECLINED") {
    setBusy(true);
    setErr(null);
    try {
      if (decision === "DECLINED" || mode === "trusted") {
        await api(`/api/checks/${v.id}/consent`, { decision });
      } else {
        await acceptWithPsi();
      }
      signalRefresh();
      window.dispatchEvent(new Event("amanah:wallet-tick"));
      reload();
    } catch {
      setErr(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  /** Runs this participant's PSI step on the device, then posts only blinded points. */
  async function acceptWithPsi() {
    const w = loadWallet(user!.id);
    if (!w) throw new Error("no_wallet");
    const genes = await walletGenes(w);
    let X = v.psi?.X ?? null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!X) {
        const { X: xs, state } = p1Start(v.id, genes);
        w.psi[v.id] = state;
        saveWallet(w);
        try {
          await api(`/api/checks/${v.id}/consent`, { decision: "ACCEPTED", psi: { X: xs } });
          return;
        } catch (e) {
          delete w.psi[v.id];
          saveWallet(w);
          if ((e as Error).message !== "x_exists") throw e;
          X = (await api<ParticipantView>(`/api/checks/${v.id}`)).psi?.X ?? null; // other person was first: become P2
        }
      } else {
        const { Y, Z, state } = p2Respond(v.id, genes, X);
        w.psi[v.id] = state;
        saveWallet(w);
        try {
          await api(`/api/checks/${v.id}/consent`, { decision: "ACCEPTED", psi: { Y, Z } });
          return;
        } catch (e) {
          delete w.psi[v.id];
          saveWallet(w);
          throw e;
        }
      }
    }
  }

  async function doWithdraw() {
    if (!window.confirm(t.consent.withdrawConfirm)) return;
    await api(`/api/checks/${v.id}/withdraw`, {});
    reload();
  }

  if (v.status === "COMPLETE")
    return (
      <Card>
        <CardTitle>{t.inbox.resultReady}</CardTitle>
        <Button asChild size="lg" className="mt-4 w-full"><Link href={`/checks/${v.id}/result`}>{t.checks.viewResult}</Link></Button>
      </Card>
    );
  if (v.status === "NOT_COMPLETED")
    return (
      <Card>
        <CardTitle>{t.checks.notCompleted}</CardTitle>
        <CardText>{t.checks.notCompletedHelp}</CardText>
      </Card>
    );
  if (v.myConsent === "DECLINED") return <Card><CardText className="mt-0">{t.consent.declinedMsg}</CardText></Card>;
  if (v.myConsent === "WITHDRAWN") return <Card><CardText className="mt-0">{t.consent.withdrawn}</CardText></Card>;
  if (v.myConsent === "ACCEPTED")
    return (
      <Card>
        <p className="flex gap-2 font-semibold text-primary"><CheckCircle2 className="size-5 shrink-0" aria-hidden />{t.consent.acceptedMsg}</p>
        <CardText>{t.checks.youAccepted}</CardText>
        <p className="mt-1 text-sm text-muted-foreground">{fmt(t.checks.expiresIn, { time: left })}</p>
        <Button variant="ghost" className="mt-3" onClick={doWithdraw}>{t.consent.withdraw}</Button>
      </Card>
    );

  // Pending: the consent screen (§6.3)
  const needsWallet = mode === "psi" && !wallet;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex gap-3">
          <ShieldQuestion className="size-7 shrink-0 text-primary" aria-hidden />
          <h1 className="text-xl font-bold">{t.consent.title}</h1>
        </div>
        <p className="mt-3 leading-relaxed">{fmt(t.consent.body, vars)}</p>
        <h2 className="mt-4 font-semibold">{t.consent.whatHappensTitle}</h2>
        <ul className="mt-2 space-y-2">
          {t.consent.whatHappens.map((s, i) => (
            <li key={i} className="flex gap-2">
              {i === 2 ? <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /> : <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />}
              <span>{fmt(s, vars)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">{fmt(t.checks.expiresIn, { time: left })}</p>
      </Card>
      {needsWallet && <WalletLoader compact onLoaded={(w) => setWallet(w)} />}
      <div className="grid gap-2 sm:grid-cols-3">
        <Button size="lg" onClick={() => decide("ACCEPTED")} disabled={busy || needsWallet}>{busy ? t.consent.working : t.consent.accept}</Button>
        <Button size="lg" variant="outline" onClick={() => decide("DECLINED")} disabled={busy}>{t.consent.decline}</Button>
        <Button size="lg" variant="ghost" asChild><Link href="/learn">{t.consent.question}</Link></Button>
      </div>
      {err && <p role="alert" className="text-sm text-amber">{err}</p>}
    </div>
  );
}
