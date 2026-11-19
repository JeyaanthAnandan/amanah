"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/providers";
import { Card, CardText } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { api } from "@/lib/api";

type P = { id: string; name: string; nameAr: string };

export function StartForm({ participants, defaultA }: { participants: P[]; defaultA: string }) {
  const { t, fmt, nameOf } = useI18n();
  const router = useRouter();
  const [aId, setA] = React.useState(defaultA);
  const [phone, setPhone] = React.useState("");
  const [b, setB] = React.useState<P | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function lookup() {
    setMsg(null);
    setB(null);
    try {
      setB(await api<P>(`/api/participants/lookup?phone=${encodeURIComponent(phone)}`));
    } catch {
      setMsg(t.start.notFound);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!b || !aId) return;
    if (b.id === aId) return setMsg(t.start.samePerson);
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ id: string }>("/api/checks", { aId, bPhone: phone });
      router.push(`/checks/${r.id}?created=1`);
    } catch (err) {
      const code = (err as Error).message;
      setMsg(code === "rate_limited" ? t.start.rateLimited : code === "same_person" ? t.start.samePerson : t.common.error);
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardText className="mt-0">{t.start.intro}</CardText>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="a">{t.start.chooseA}</Label>
          <Select id="a" value={aId} onChange={(e) => setA(e.target.value)} required>
            <option value="">{t.start.selectPlaceholder}</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{nameOf(p)}</option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">{t.start.chooseAHelp}</p>
        </div>
        <div>
          <Label htmlFor="phone">{t.start.lookupB}</Label>
          <div className="flex gap-2">
            <Input id="phone" inputMode="tel" dir="ltr" value={phone} onChange={(e) => { setPhone(e.target.value); setB(null); }} placeholder="050 000 0005" />
            <Button type="button" variant="secondary" className="mt-1" onClick={lookup}>{t.start.lookupButton}</Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t.start.lookupHelp}</p>
          {b && <p className="mt-2 font-semibold text-primary">{fmt(t.start.found, { name: nameOf(b) })}</p>}
        </div>
        {msg && <p role="alert" className="rounded-xl bg-amber-soft p-3 text-sm text-amber">{msg}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={!b || !aId || busy}>{t.start.submit}</Button>
      </form>
    </Card>
  );
}
