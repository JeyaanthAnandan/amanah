import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { getCurrentUser, getLang } from "@/server/session";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { dirOf, getDict } from "@/i18n";
import type { Role } from "@/lib/roles";
import { WalletAgent } from "@/components/wallet-agent";

const latin = Inter({ subsets: ["latin"], variable: "--font-latin" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "600", "700"], variable: "--font-arabic" });

export const metadata: Metadata = {
  title: "Amanah",
  description: "Private, consent-based genetic compatibility checks (hackathon prototype, synthetic data).",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);
  const personas = (await db.user.findMany({ where: { simulated: false } })).map((u) => ({
    id: u.id, name: u.name, nameAr: u.nameAr, roles: parseJson<Role[]>(u.roles, []),
  }));
  const order = ["mariam", "saeed", "hessa", "ahmed", "fatima", "khalid", "noura", "layla", "omar"];
  personas.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const t = getDict(lang);
  const clientUser = user ? { id: user.id, name: user.name, nameAr: user.nameAr, roles: user.roles } : null;

  return (
    <html lang={lang} dir={dirOf(lang)} className={`${latin.variable} ${arabic.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers lang={lang} user={clientUser}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-2">Skip to content</a>
          <Header personas={personas} />
          <main id="main" className="mx-auto max-w-3xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-muted-foreground">
            <p>{t.common.notDiagnosis}</p>
          </footer>
          <WalletAgent />
        </Providers>
      </body>
    </html>
  );
}
