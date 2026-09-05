import React from "react";
import { getSessionUser } from "@/lib/auth";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import RekapPpidClient from "./RekapPpidClient";
import { getPpidDataAction } from "@/app/actions/ppid";

export const revalidate = 0;

export default async function RekapPpidPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["WAKA", "BK"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard?error=unauthorized");
  }

  const res = await getPpidDataAction();
  const permohonanList = res.success && res.permohonanList ? res.permohonanList : [];
  const keberatanList = res.success && res.keberatanList ? res.keberatanList : [];

  return (
    <SidebarLayout user={user}>
      <RekapPpidClient
        user={user}
        initialPermohonanList={permohonanList as any}
        initialKeberatanList={keberatanList as any}
      />
    </SidebarLayout>
  );
}
