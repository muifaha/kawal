import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 0; // Disable cache for this API route to reflect settings changes instantly

export async function GET() {
  try {
    const settingsList = await prisma.appSetting.findMany();
    const settings: Record<string, string> = {};
    settingsList.forEach((s) => {
      settings[s.key] = s.value;
    });

    return NextResponse.json({
      schoolName: settings.school_name || "KAWAL",
      schoolLogo: settings.school_logo || "",
    });
  } catch (error) {
    console.error("Fetch API settings error:", error);
    return NextResponse.json({
      schoolName: "KAWAL",
      schoolLogo: "",
    });
  }
}
