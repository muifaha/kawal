import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "pt"; // "pt" or "prodi"
  const q = searchParams.get("q") || "";

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const queryClean = encodeURIComponent(q.trim());

  try {
    let results: string[] = [];

    // Attempt fetching from PDDIKTI Public Search API
    const targetUrl =
      type === "pt"
        ? `https://api-pddikti.kemdiktisaintek.go.id/pencarian/pt/${queryClean}`
        : `https://api-pddikti.kemdiktisaintek.go.id/pencarian/prodi/${queryClean}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        results = data
          .map((item: any) => {
            if (type === "pt") {
              return item.nama_pt || item.nama || item.text;
            } else {
              const ptName = item.nama_pt ? ` (${item.nama_pt})` : "";
              const prodi = item.nama_prodi || item.nama || item.text;
              return prodi ? `${prodi}${ptName}` : null;
            }
          })
          .filter(Boolean);
      }
    }

    // Fallback popular list if live API request is empty or unavailable
    if (results.length === 0) {
      const popularPT = [
        "Universitas Indonesia (UI)",
        "Institut Teknologi Bandung (ITB)",
        "Universitas Gadjah Mada (UGM)",
        "Institut Teknologi Sepuluh Nopember (ITS)",
        "Universitas Diponegoro (UNDIP)",
        "Universitas Padjadjaran (UNPAD)",
        "Universitas Airlangga (UNAIR)",
        "Universitas Brawijaya (UB)",
        "Universitas Sebelas Maret (UNS)",
        "Universitas Negeri Yogyakarta (UNY)",
        "Universitas Negeri Jakarta (UNJ)",
        "Universitas Negeri Semarang (UNNES)",
        "Universitas Negeri Malang (UM)",
        "Universitas Negeri Surabaya (UNESA)",
        "Telkom University",
        "Politeknik Negeri Bandung (POLBAN)",
        "Politeknik Negeri Jakarta (PNJ)",
        "Politeknik Negeri Semarang (POLINES)",
        "Politeknik Manufaktur Bandung (POLMAN)",
        "Sekolah Tinggi Akuntansi Negara (PKN STAN)",
        "Institut Pemerintahan Dalam Negeri (IPDN)",
        "Politeknik Ilmu Pemasyarakatan (POLTEKIP)",
        "Politeknik Imigrasi (POLTEKIM)",
        "Sekolah Tinggi Intelijen Negara (STIN)",
        "Politeknik Siber dan Sandi Negara (PSSN)",
        "UIN Syarif Hidayatullah Jakarta",
        "UIN Sunan Kalijaga Yogyakarta",
        "UIN Maulana Malik Ibrahim Malang",
      ];

      const popularProdi = [
        "S1 Teknik Informatika",
        "S1 Sistem Informasi",
        "S1 Teknik Komputer",
        "S1 Ilmu Komputer",
        "S1 Teknik Elektro",
        "S1 Teknik Mesin",
        "S1 Teknik Sipil",
        "S1 Teknik Industri",
        "S1 Kedokteran",
        "S1 Farmasi",
        "S1 Manajemen",
        "S1 Akuntansi",
        "S1 Ekonomi Pembangunan",
        "S1 Hukum",
        "S1 Psikologi",
        "S1 Ilmu Komunikasi",
        "S1 Hubungan Internasional",
        "S1 Desain Komunikasi Visual (DKV)",
        "D4 Teknik Informatika",
        "D3 Akuntansi",
        "D3 Manajemen Informatika",
        "S1 Pendidikan Guru Sekolah Dasar (PGSD)",
        "S1 Bahasa & Sastra Inggris",
      ];

      const sourceList = type === "pt" ? popularPT : popularProdi;
      results = sourceList.filter((name) =>
        name.toLowerCase().includes(q.toLowerCase())
      );
    }

    return NextResponse.json({ results: results.slice(0, 15) });
  } catch (error) {
    return NextResponse.json({ results: [] });
  }
}
