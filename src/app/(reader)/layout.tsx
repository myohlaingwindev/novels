import type { ReactNode } from "react";
import { requireUser } from "@/auth/current";
import { BottomNav, Header, SiteFooter } from "./header";

export const dynamic = "force-dynamic";

export default async function ReaderLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Header user={user} />
      {children}
      <SiteFooter />
      <BottomNav user={user} />
    </>
  );
}
