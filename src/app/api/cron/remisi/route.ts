import { NextRequest, NextResponse } from "next/server";
import { checkAndApplyAutomaticRemissions } from "@/app/actions/remisi";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key =
      searchParams.get("key") ||
      searchParams.get("amp;key") ||
      request.headers.get("x-cron-key") ||
      "";

    const secretKey = process.env.CRON_SECRET || "kawal-cron-secret-key-2026";

    if (!key || key.trim() !== secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Secret key cron tidak valid.",
        },
        { status: 401 }
      );
    }

    const result = await checkAndApplyAutomaticRemissions();

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Cron Automatic Remission API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Terjadi kesalahan pada cron remisi otomatis.",
      },
      { status: 500 }
    );
  }
}
