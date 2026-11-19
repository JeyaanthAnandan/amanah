import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { WalletLoader } from "@/components/wallet-loader";

export default async function WalletPage() {
  const { user, t } = await pageCtx("participant");
  if (!user) return <NotAllowed />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.wallet.title}</h1>
      <WalletLoader />
    </div>
  );
}
