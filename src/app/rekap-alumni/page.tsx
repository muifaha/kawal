import React from "react";
import { getSessionUser } from "@/lib/auth";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import RekapAlumniClient from "./RekapAlumniClient";
import { getAlumniTracerListAction } from "@/app/actions/alumni";

export const revalidate = 0;

export default async function RekapAlumniPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["WAKA", "BK", "WALAS", "GURU"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard?error=unauthorized");
  }

  const resAlumni = await getAlumniTracerListAction();
  const initialAlumniList = resAlumni.success && resAlumni.data ? resAlumni.data : [];

  return (
    <SidebarLayout user={user}>
      <RekapAlumniClient user={user} initialAlumniList={initialAlumniList as any} />
    </SidebarLayout>
  );
}
