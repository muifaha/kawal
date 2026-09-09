import { NextRequest, NextResponse } from "next/server";
import { getRencanaAksiData } from "@/lib/rencanaAksiService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Token Authentication
    const expectedToken = process.env.RENCANA_AKSI_TOKEN || process.env.API_TOKEN || "kawal-rencana-aksi-token-2026";

    const authHeader = request.headers.get("authorization");
    const headerToken =
      (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null) ||
      request.headers.get("x-api-key") ||
      request.headers.get("x-api-token");

    const queryToken =
      searchParams.get("token") ||
      searchParams.get("amp;token") ||
      searchParams.get("api_key") ||
      searchParams.get("amp;api_key") ||
      searchParams.get("key") ||
      searchParams.get("amp;key");

    const providedToken = (headerToken || queryToken || "").trim();

    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Token API tidak valid atau tidak disertakan.",
          hint: "Sertakan token melalui Header 'Authorization: Bearer <token>', 'X-API-Key: <token>', atau Query Param '?token=<token>'",
        },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
          },
        }
      );
    }

    // Support single date
    const tanggalStr =
      searchParams.get("tanggal") ||
      searchParams.get("amp;tanggal") ||
      searchParams.get("date") ||
      searchParams.get("amp;date") ||
      undefined;

    // Support date range
    const dariStr =
      searchParams.get("dari") ||
      searchParams.get("amp;dari") ||
      searchParams.get("startDate") ||
      searchParams.get("amp;startDate") ||
      searchParams.get("dariTanggal") ||
      searchParams.get("amp;dariTanggal") ||
      undefined;

    const sampaiStr =
      searchParams.get("sampai") ||
      searchParams.get("amp;sampai") ||
      searchParams.get("endDate") ||
      searchParams.get("amp;endDate") ||
      searchParams.get("sampaiTanggal") ||
      searchParams.get("amp;sampaiTanggal") ||
      undefined;

    // Support month filter (e.g. 2026-09)
    const bulanStr =
      searchParams.get("bulan") ||
      searchParams.get("amp;bulan") ||
      searchParams.get("month") ||
      searchParams.get("amp;month") ||
      undefined;

    // Filters
    const guruId = searchParams.get("guruId") || searchParams.get("amp;guruId") || undefined;
    const nip = searchParams.get("nip") || searchParams.get("amp;nip") || undefined;
    const search = searchParams.get("search") || searchParams.get("amp;search") || undefined;

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
      token: providedToken,
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
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}
