import { NextRequest, NextResponse } from "next/server";
import { getRencanaAksiData } from "@/lib/rencanaAksiService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Support single date
    const tanggalStr = searchParams.get("tanggal") || searchParams.get("date") || undefined;

    // Support date range
    const dariStr =
      searchParams.get("dari") ||
      searchParams.get("startDate") ||
      searchParams.get("dariTanggal") ||
      undefined;

    const sampaiStr =
      searchParams.get("sampai") ||
      searchParams.get("endDate") ||
      searchParams.get("sampaiTanggal") ||
      undefined;

    // Support month filter (e.g. 2026-09)
    const bulanStr = searchParams.get("bulan") || searchParams.get("month") || undefined;

    // Filters
    const guruId = searchParams.get("guruId") || undefined;
    const nip = searchParams.get("nip") || undefined;
    const search = searchParams.get("search") || undefined;

    // Build base URL dynamically from request header / origin
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    const data = await getRencanaAksiData({
      tanggalStr,
      dariStr,
      sampaiStr,
      bulanStr,
      guruId,
      nip,
      search,
      baseUrl,
    });

    return NextResponse.json(
      {
        success: true,
        filter: {
          tanggal: tanggalStr || null,
          dari: dariStr || null,
          sampai: sampaiStr || null,
          bulan: bulanStr || null,
        },
        totalData: data.length,
        data,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error: any) {
    console.error("API Rencana Aksi error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
