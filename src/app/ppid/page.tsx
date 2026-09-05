import React from "react";
import { prisma } from "@/lib/prisma";
import PpidClient from "./PpidClient";

export const revalidate = 0;

export default async function PpidPage() {
  const settingsList = await prisma.appSetting.findMany();
  const schoolName = settingsList.find((s) => s.key === "school_name")?.value || "SMAN 6 Tangerang";
  const schoolLogo = settingsList.find((s) => s.key === "school_logo")?.value || "";

  return <PpidClient schoolName={schoolName} schoolLogo={schoolLogo} />;
}
