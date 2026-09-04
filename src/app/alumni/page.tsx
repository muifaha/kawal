import React from "react";
import { prisma } from "@/lib/prisma";
import AlumniTracerClient from "./AlumniTracerClient";

export const revalidate = 0; // Disable cache so changes in school identity settings are reflected instantly on reload

export default async function AlumniTracerPage() {
  const settingsList = await prisma.appSetting.findMany();
  const schoolName = settingsList.find((s) => s.key === "school_name")?.value || "KAWAL Sekolahan";
  const schoolLogo = settingsList.find((s) => s.key === "school_logo")?.value || "";

  return <AlumniTracerClient schoolName={schoolName} schoolLogo={schoolLogo} />;
}
