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

  const resData = await getPpidDataAction();
  const initialPermohonan = resData.success && resData.permohonanList ? resData.permohonanList : [];
  const initialKeberatan = resData.success && resData.keberatanList ? resData.keberatanList : [];

  return (
    <SidebarLayout user={user}>
      <RekapPpidClient
        user={user}
        initialPermohonan={initialPermohonan as any}
        initialKeberatan={initialKeberatan as any}
      />
    </SidebarLayout>
  );
}
