"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useI18n } from "@/components/providers";
import { Card, CardText } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Section, ReadAloud } from "@/components/read-aloud";
import { IconArray } from "@/components/icon-array";
import { ConditionCard, conditionSpeech } from "@/components/condition-card";
import { TeachBack } from "@/components/teach-back";
import { ReferralForm, ReferralStatus } from "@/components/referral-form";
import { SureTest } from "@/components/sure-test";
import { FamilyShare } from "@/components/family-share";
import { AskAmanah } from "@/components/ask-amanah";
import { usePoll, signalRefresh } from "@/lib/use-poll";
import { api } from "@/lib/api";
import type { ParticipantView } from "@/server/views";
import { Eye, HeartHandshake, Leaf, Loader2, Server, Users } from "lucide-react";

const seenKey = (id: string, user?: string) => `amanah:seen:${user}:${id}`;

export function ResultView({ id }: { id: string }) {
  const { t, user } = useI18n();
  const router = useRouter();
  const { data } = usePoll<ParticipantView>(`/api/checks/${id}`);
  const [show, setShow] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    try {
      setShow(sessionStorage.getItem(seenKey(id, user?.id)) === "1");
    } catch {
      setShow(false);
    }
  }, [id, user?.id]);

  if (!data || show === null) return <p>{t.common.loading}</p>;
  if (data.kind !== "participant") return <Card><CardText className="mt-0">{t.common.notAllowed}</CardText></Card>;
  if (data.status !== "COMPLETE")
    return (
      <Card className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        <span>{data.status === "WAITING" ? t.result.computing : t.checks.notCompleted}</span>
      </Card>
    );

  // The same gentle interstitial is shown for every result, so its presence reveals nothing.
  if (!show)
    return (
      <Card className="bg-primary-soft/50 text-center">
        <Leaf className="mx-auto size-10 text-primary" aria-hidden />
        <h1 className="mt-3 text-xl font-bold">{t.result.interstitialTitle}</h1>
        <p className="mt-2 leading-relaxed">{t.result.interstitialBody}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button size="lg" onClick={() => {
            try { sessionStorage.setItem(seenKey(id, user?.id), "1"); } catch {}
            api(`/api/checks/${id}/viewed`, {}).catch(() => {});
            setShow(true);
          }}>{t.result.viewNow}</Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/inbox")}>{t.result.viewLater}</Button>
        </div>
      </Card>
    );

  return data.sharedRisk ? <SharedRisk v={data} /> : <NoSharedRisk v={data} />;
}

function NoSharedRisk({ v }: { v: ParticipantView }) {
  const { t, fmt, nameOf } = useI18n();
  const body = fmt(t.result.noRiskBody, { other: nameOf(v.other) });
  return (
    <div className="space-y-4">
      <Section title={t.result.noRiskTitle} speak={body} scope={v.id}>
        <p className="leading-relaxed">{body}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href="/learn">{t.result.learnMore}</Link></Button>
          <Button asChild variant="ghost"><Link href={`/checks/${v.id}/server`}><Server className="size-4" aria-hidden />{t.result.serverView}</Link></Button>
        </div>
      </Section>
      <Section title={t.teach.title} speak={t.teach.qNo.q} scope={v.id}>
        <TeachBack checkId={v.id} questions={["qNo"]} />
      </Section>
      <Section title={t.result.shareWithFamily} speak={t.family.shareIntro} scope={v.id}>
        <FamilyShare v={v} />
      </Section>
    </div>
  );
}

function SharedRisk({ v }: { v: ParticipantView }) {
  const { t, fmt, nameOf, lang } = useI18n();
  const router = useRouter();
  const [worried, setWorried] = React.useState(false);
  const [worriedMsg, setWorriedMsg] = React.useState(false);
  const other = nameOf(v.other);
  const body = fmt(t.result.riskBody, { other });
  const go = (anchor: string) => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });

  async function feelingWorried() {
    setWorried(true);
    setWorriedMsg(true);
    await api("/api/referrals/worried", { checkId: v.id }).catch(() => {});
    signalRefresh();
    go("talk");
  }

  async function reveal(decision: "ACCEPTED" | "DECLINED") {
    await api(`/api/checks/${v.id}/reveal`, { decision });
    window.dispatchEvent(new Event("amanah:wallet-tick"));
    signalRefresh();
  }

  const optionsSpeech = [t.explain.optionsIntro, ...t.explain.options.map((o) => `${o.title}. ${o.body}`), t.explain.optionsFooter].join(" ");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border-2 border-sand-strong/40 bg-amber-soft/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{t.result.riskTitle}</h1>
          <ReadAloud text={`${t.result.riskTitle}. ${body}`} scope={v.id} />
        </div>
        <p className="mt-3 leading-relaxed">{body}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Button size="lg" onClick={() => go("means")}>{t.result.understand}</Button>
          <Button size="lg" variant="secondary" onClick={() => go("talk")}>{t.result.talk}</Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/inbox")}>{t.result.later}</Button>
        </div>
        <Button variant="ghost" className="mt-3 w-full border border-dashed border-sand-strong" onClick={feelingWorried}>
          <HeartHandshake className="size-5" aria-hidden />{t.result.worried}
        </Button>
        {worriedMsg && <p className="mt-2 rounded-xl bg-card p-3 text-sm" aria-live="polite">{t.result.worriedDone}</p>}
      </section>

      <h2 className="pt-2 text-lg font-bold text-primary">{t.explain.title}</h2>

      <Section id="means" title={t.explain.meansTitle} speak={t.explain.meansBody} scope={v.id}>
        <p className="leading-relaxed">{t.explain.meansBody}</p>
      </Section>

      <Section title={t.explain.iconTitle} speak={`${t.explain.iconIntro} ${t.explain.affected}. ${t.explain.carrier}. ${t.explain.notCarrier}. ${t.explain.caption}`} scope={v.id}>
        <IconArray />
      </Section>

      <Section
        title={t.explain.seriousTitle}
        speak={v.conditionIds.length ? v.conditionIds.map((c) => conditionSpeech(c, lang)).join(" ") : t.explain.seriousBody}
        scope={v.id}
      >
        {v.revealState !== "REVEALED" && <p className="leading-relaxed">{t.explain.seriousBody}</p>}
        {v.revealState === "NONE" && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => reveal("ACCEPTED")}><Eye className="size-4" aria-hidden />{t.explain.revealButton}</Button>
            <Button variant="outline" onClick={() => reveal("DECLINED")}>{t.explain.revealDecline}</Button>
          </div>
        )}
        {v.revealState === "WAITING_OTHER" && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{fmt(t.explain.revealWaiting, { other })}</p>}
        {v.revealState === "COMPUTING" && (
          <p className="mt-3 flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" aria-hidden />{t.explain.revealComputing}</p>
        )}
        {v.revealState === "DECLINED" && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{t.explain.revealUnavailable}</p>}
        {v.revealState === "REVEALED" && <div className="space-y-3">{v.conditionIds.map((c) => <ConditionCard key={c} id={c} />)}</div>}
      </Section>

      <Section title={t.explain.optionsTitle} speak={optionsSpeech} scope={v.id}>
        <p className="text-sm text-muted-foreground">{t.explain.optionsIntro}</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2" aria-label={t.explain.optionsTitle}>
          {t.explain.options.map((o) => (
            <li key={o.title} className="rounded-xl border border-border bg-background p-4">
              <h3 className="font-semibold">{o.title}</h3>
              <p className="mt-1 text-sm leading-relaxed">{o.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.explain.optionsFooter}</p>
      </Section>

      <Section id="talk" title={t.explain.talkTitle} speak={t.explain.talkBody} scope={v.id}>
        <p className="mb-3 leading-relaxed">{t.explain.talkBody}</p>
        {v.referral ? <ReferralStatus r={v.referral} /> : <ReferralForm v={v} worried={worried} />}
      </Section>

      <Section title={t.teach.title} speak={`${t.teach.intro} ${t.teach.q1.q}`} scope={v.id}>
        <TeachBack checkId={v.id} questions={["q1", "q2", "q3"]} />
      </Section>

      <Section title={t.ask.title} speak={t.ask.disclaimer} scope={v.id}>
        <AskAmanah checkId={v.id} conditionIds={v.conditionIds} onEscalate={() => go("talk")} />
      </Section>

      <Section title={t.sure.title} speak={t.sure.items.join(" ")} scope={v.id}>
        <SureTest checkId={v.id} />
      </Section>

      <Section title={t.result.shareWithFamily} speak={t.family.shareIntro} scope={v.id}>
        <FamilyShare v={v} />
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="ghost"><Link href={`/checks/${v.id}/server`}><Server className="size-4" aria-hidden />{t.result.serverView}</Link></Button>
        <Button asChild variant="ghost"><Link href="/privacy"><Users className="size-4" aria-hidden />{t.nav.privacy}</Link></Button>
      </div>
    </div>
  );
}
