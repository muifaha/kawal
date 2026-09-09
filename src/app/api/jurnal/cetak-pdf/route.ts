import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const guruId = searchParams.get("guruId");
  const tanggal = searchParams.get("tanggal");

  if (!guruId || !tanggal) {
    return NextResponse.json({ error: "Parameter guruId dan tanggal wajib diisi." }, { status: 400 });
  }

  // Redirect GET /api/jurnal/cetak-pdf to /jurnal/cetak
  const redirectUrl = new URL(`/jurnal/cetak?guruId=${guruId}&tanggal=${tanggal}`, request.url);
  return NextResponse.redirect(redirectUrl);
}
