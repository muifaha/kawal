import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Clean up params in case &amp; was passed in URL
  const guruId = searchParams.get("guruId") || searchParams.get("amp;guruId");
  const tanggal = searchParams.get("tanggal") || searchParams.get("amp;tanggal");
  const token = searchParams.get("token") || searchParams.get("amp;token");

  if (!guruId || !tanggal) {
    return NextResponse.json({ error: "Parameter guruId dan tanggal wajib diisi." }, { status: 400 });
  }

  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
  const redirectUrl = new URL(`/jurnal/cetak?guruId=${guruId}&tanggal=${tanggal}${tokenParam}`, request.url);
  return NextResponse.redirect(redirectUrl);
}
