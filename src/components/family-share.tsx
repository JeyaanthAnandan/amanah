"use client";
import * as React from "react";
import { useI18n } from "./providers";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label, Select } from "./ui/field";
import { usePoll, signalRefresh } from "@/lib/use-poll";
import { api } from "@/lib/api";
import type { ParticipantView } from "@/server/views";

type ShareRow = { id: string; level: "COMPLETED" | "RESULT" | "RESULT_CONDITION"; state: "PENDING" | "ACTIVE" | "REVOKED" | "EXPIRED"; mine: boolean; recipient: { name: string; nameAr: string }; expiresAt: string };
type Member = { id: string; name: string; nameAr: string };

export function FamilyShare({ v }: { v: ParticipantView }) {
  const { t, fmt, nameOf, lang } = useI18n();
  const { data, reload } = usePoll<{ shares: ShareRow[] }>(`/api/shares?checkId=${v.id}`);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [recipientId, setRecipient] = React.useState("");
  const [level, setLevel] = React.useState<ShareRow["level"]>("COMPLETED");
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    api<{ members: Member[] }>("/api/family-members").then((r) => setMembers(r.members)).catch(() => {});
  }, []);

  const other = nameOf(v.other);
  const levels: ShareRow["level"][] = v.conditionIds.length ? ["COMPLETED", "RESULT", "RESULT_CONDITION"] : ["COMPLETED", "RESULT"];

  async function propose(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/shares", { checkId: v.id, recipientId, level });
      setMsg(level === "COMPLETED" ? t.family.shared : fmt(t.family.proposed, { other }));
      reload();
    } catch {
      setMsg(t.common.error);
    }
  }
  async function act(id: string, action: "approve" | "decline" | "revoke") {
    await api(`/api/shares/${id}`, { action });
    reload();
    signalRefresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">{t.family.shareIntro}</p>
      {!!data?.shares.length && (
        <ul className="space-y-2">
          {data.shares.map((s) => (
            <li key={s.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{nameOf(s.recipient)}</span>
                <Badge variant="sand">{t.family.level[s.level]}</Badge>
                <Badge variant={s.state === "ACTIVE" ? "default" : "outline"}>
                  {s.state === "PENDING" ? (s.mine ? fmt(t.family.pending, { other }) : fmt(t.family.approvalTitle, { other })) : s.state === "ACTIVE" ? t.family.shared : t.family.revoked}
                </Badge>
              </div>
              {s.state === "ACTIVE" && <p className="mt-1 text-xs text-muted-foreground">{fmt(t.family.expires, { date: new Date(s.expiresAt).toLocaleDateString(lang === "ar" ? "ar-AE" : "en-AE") })}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {s.state === "PENDING" && !s.mine && (
                  <>
                    <Button size="sm" onClick={() => act(s.id, "approve")}>{t.family.approve}</Button>
                    <Button size="sm" variant="outline" onClick={() => act(s.id, "decline")}>{t.family.decline}</Button>
                  </>
                )}
                {(s.state === "ACTIVE" || (s.state === "PENDING" && s.mine)) && (
                  <Button size="sm" variant="outline" onClick={() => act(s.id, "revoke")}>{t.family.revoke}</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={propose} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="rec">{t.family.recipient}</Label>
          <Select id="rec" value={recipientId} onChange={(e) => setRecipient(e.target.value)} required>
            <option value="">{t.start.selectPlaceholder}</option>
            {members.map((m) => <option key={m.id} value={m.id}>{nameOf(m)}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="lvl">{t.family.levelLabel}</Label>
          <Select id="lvl" value={level} onChange={(e) => setLevel(e.target.value as ShareRow["level"])}>
            {levels.map((l) => <option key={l} value={l}>{t.family.level[l]}</option>)}
          </Select>
        </div>
        <Button type="submit" variant="secondary" disabled={!recipientId}>{t.family.propose}</Button>
      </form>
      {msg && <p className="text-sm" aria-live="polite">{msg}</p>}
    </div>
  );
}
