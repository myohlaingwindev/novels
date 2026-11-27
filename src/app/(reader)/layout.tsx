import type { ReactNode } from "react";
import { requireUser } from "@/services/auth/current";
import { creditBalance } from "@/services/credits/ledger";
import { getDatabase } from "@/db/client";
import { BottomNav, Header, SiteFooter } from "./header";

export const dynamic = "force-dynamic";

export default async function ReaderLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const balance = await creditBalance(await getDatabase(), user.id);
  return (
    <>
      <Header user={user} balance={balance} />
      {children}
      <SiteFooter />
      <BottomNav user={user} />
    </>
  );
}
