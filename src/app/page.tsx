import Link from "next/link";
import { pageCtx } from "@/server/page";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default async function Home() {
  const { t, user } = await pageCtx();
  const roles = user?.roles ?? [];
  const primary = roles.includes("family_initiator")
    ? { href: "/start", label: t.home.cta }
    : roles.includes("participant") || roles.includes("family_member")
      ? { href: roles.includes("participant") ? "/inbox" : "/family", label: t.home.openInbox }
      : roles.includes("counsellor")
        ? { href: "/counsellor", label: t.nav.counsellor }
        : roles.includes("doh_analyst")
          ? { href: "/dashboard", label: t.nav.dashboard }
          : { href: "/demo", label: t.nav.demo };
  return (
    <div className="space-y-5">
      <Card className="bg-primary-soft/60">
        <h1 className="text-2xl font-bold text-primary">{t.home.title}</h1>
        <CardText className="text-foreground">{t.home.intro}</CardText>
        <ul className="mt-4 space-y-2">
          {t.home.points.map((p) => (
            <li key={p} className="flex gap-2">
              <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <Button asChild size="lg" className="mt-5 w-full sm:w-auto">
          <Link href={primary.href}>{primary.label}</Link>
        </Button>
      </Card>
      {!user && (
        <Card>
          <CardTitle>{t.auth.choosePersona}</CardTitle>
          <CardText>{t.demoPage.intro}</CardText>
        </Card>
      )}
    </div>
  );
}
