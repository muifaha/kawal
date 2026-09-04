import { NextResponse } from "next/server";

// Comprehensive Master Dataset of Indonesian Universities (PTN, PTS, Kedinasan, Politeknik, UIN/IAIN)
const MASTER_PT = [
  // PTN Utama
  "Universitas Indonesia (UI)",
  "Institut Teknologi Bandung (ITB)",
  "Universitas Gadjah Mada (UGM)",
  "Institut Teknologi Sepuluh Nopember (ITS)",
  "Universitas Diponegoro (UNDIP)",
  "Universitas Padjadjaran (UNPAD)",
  "Universitas Airlangga (UNAIR)",
  "Universitas Brawijaya (UB)",
  "Universitas Sebelas Maret (UNS)",
  "Universitas IPB (IPB University)",
  "Universitas Hasanuddin (UNHAS)",
  "Universitas Sumatera Utara (USU)",
  "Universitas Andalas (UNAND)",
  "Universitas Riau (UNRI)",
  "Universitas Sriwijaya (UNSRI)",
  "Universitas Lampung (UNILA)",
  "Universitas Udayana (UNUD)",
  "Universitas Mataram (UNRAM)",
  "Universitas Sam Ratulangi (UNSRAT)",
  "Universitas Pattimura (UNPATTI)",
  "Universitas Cenderawasih (UNCEN)",
  "Universitas Mulawarman (UNMUL)",
  "Universitas Lambung Mangkurat (ULM)",
  "Universitas Tadulako (UNTAD)",
  "Universitas Halu Oleo (UHO)",
  "Universitas Syiah Kuala (USK)",
  "Universitas Malikussaleh (UNIMAL)",
  "Universitas Negeri Yogyakarta (UNY)",
  "Universitas Negeri Jakarta (UNJ)",
  "Universitas Negeri Semarang (UNNES)",
  "Universitas Negeri Malang (UM)",
  "Universitas Negeri Surabaya (UNESA font-semibold)",
  "Universitas Negeri Surabaya (UNESA)",
  "Universitas Negeri Makassar (UNM)",
  "Universitas Negeri Medan (UNIMED)",
  "Universitas Negeri Padang (UNP)",
  "Universitas Negeri Gorontalo (UNG)",
  "Universitas Pendidikan Indonesia (UPI)",
  "Universitas Jenderal Soedirman (UNSOED)",
  "Universitas Jember (UNEJ)",
  "Universitas Tidar (UNTIDAR)",
  "Universitas Pembangunan Nasional Veteran Jakarta (UPNVJ)",
  "Universitas Pembangunan Nasional Veteran Yogyakarta (UPNVY)",
  "Universitas Pembangunan Nasional Veteran Jawa Timur (UPNVJT)",
  "Universitas Singaperbangsa Karawang (UNSIKA)",
  "Universitas Siliwangi (UNSIL)",
  "Universitas Sultan Ageng Tirtayasa (UNTIRTA)",
  "Universitas Bangka Belitung (UBB)",
  "Universitas Maritim Raja Ali Haji (UMRAH)",
  "Universitas Musamus Merauke (UNMUS)",
  "Universitas Timor (UNIMOR font-bold)",

  // PTS Terkenal
  "Telkom University (Tel-U)",
  "Universitas Bina Nusantara (BINUS University)",
  "Universitas Muhammadiyah Surakarta (UMS)",
  "Universitas Muhammadiyah Yogyakarta (UMY font-bold)",
  "Universitas Muhammadiyah Malang (UMM)",
  "Universitas Muhammadiyah Jakarta (UMJ)",
  "Universitas Muhammadiyah Prof. DR. HAMKA (UHAMKA)",
  "Universitas Islam Indonesia (UII)",
  "Universitas Katolik Indonesia Atma Jaya (Unika Atma Jaya)",
  "Universitas Parahyangan (UNPAR)",
  "Universitas Pelita Harapan (UPH)",
  "Universitas Tarumanagara (UNTAR)",
  "Universitas Trisakti",
  "Universitas Mercu Buana",
  "Universitas Gunadarma",
  "Universitas Ahmad Dahlan (UAD)",
  "Universitas Dian Nuswantoro (UDINUS)",
  "Universitas Islam Sultan Agung (UNISSULA)",
  "Universitas Kristen Satya Wacana (UKSW)",
  "Universitas Sanata Dharma (USD)",
  "Universitas Surabaya (UBAYA)",
  "Universitas Ciputra Surabaya",
  "Universitas Multimedia Nusantara (UMN)",
  "Universitas Prasetiya Mulya",
  "Universitas President (President University font-bold)",
  "Universitas Al-Azhar Indonesia (UAI)",
  "Universitas Pancasila",
  "Universitas Pertamina",

  // UIN & IAIN
  "UIN Syarif Hidayatullah Jakarta",
  "UIN Sunan Kalijaga Yogyakarta",
  "UIN Sunan Gunung Djati Bandung",
  "UIN Sunan Ampel Surabaya",
  "UIN Maulana Malik Ibrahim Malang",
  "UIN Walisongo Semarang",
  "UIN Alauddin Makassar",
  "UIN Sumatera Utara Medan",
  "UIN Raden Fatah Palembang",
  "UIN Ar-Raniry Banda Aceh",
  "UIN Raden Intan Lampung",
  "UIN Sultan Syarif Kasim Riau",

  // Sekolah Kedinasan & PTK
  "Sekolah Tinggi Akuntansi Negara (PKN STAN)",
  "Institut Pemerintahan Dalam Negeri (IPDN)",
  "Sekolah Tinggi Intelijen Negara (STIN)",
  "Politeknik Siber dan Sandi Negara (PSSN)",
  "Politeknik Statitiska STIS",
  "Politeknik Ilmu Pemasyarakatan (POLTEKIP)",
  "Politeknik Imigrasi (POLTEKIM)",
  "Sekolah Tinggi Meteorologi Klimatologi dan Geofisika (STMKG)",
  "Politeknik Transportasi Darat Indonesia (PTDI-STTD)",
  "Politeknik Penerbangan Indonesia Curug (PPI Curug)",
  "Akademi Militer (AKMIL)",
  "Akademi Kepolisian (AKPOL)",
  "Universitas Pertahanan (UNHAN)",

  // Politeknik Negeri
  "Politeknik Negeri Bandung (POLBAN)",
  "Politeknik Negeri Jakarta (PNJ)",
  "Politeknik Negeri Semarang (POLINES)",
  "Politeknik Negeri Malang (POLINEMA)",
  "Politeknik Elektronika Negeri Surabaya (PENS)",
  "Politeknik Perkapalan Negeri Surabaya (PPNS)",
  "Politeknik Manufaktur Bandung (POLMAN)",
  "Politeknik Negeri Medan (POLMED)",
  "Politeknik Negeri Sriwijaya (POLSRI)",
  "Politeknik Negeri Padang (PNP)",
  "Politeknik Negeri Lampung (POLINELA)",
  "Politeknik Negeri Bali (PNB)",
  "Politeknik Negeri Ujung Pandang (PNUP)",
  "Politeknik Kesehatan Kemenkes (Poltekkes Jakarta / Bandung / Semarang / Surabaya / Yogyakarta)",
];

// Comprehensive Master Dataset of Study Programs (Program Studi / Prodi)
const MASTER_PRODI = [
  // Teknik & IT
  "S1 Teknik Informatika",
  "S1 Sistem Informasi",
  "S1 Rekayasa Perangkat Lunak (RPL)",
  "S1 Ilmu Komputer",
  "S1 Teknik Komputer",
  "S1 Teknologi Informasi",
  "S1 Data Science / Sains Data",
  "S1 Kecerdasan Buatan (Artificial Intelligence)",
  "S1 Cyber Security / Keamanan Siber",
  "S1 Teknik Elektro",
  "S1 Teknik Mesin",
  "S1 Teknik Sipil",
  "S1 Teknik Industri",
  "S1 Teknik Kimia",
  "S1 Teknik Fisika",
  "S1 Teknik Lingkungan",
  "S1 Teknik Geologi",
  "S1 Teknik Pertambangan",
  "S1 Teknik Perminyakan",
  "S1 Teknik Geodesi / Geomatika",
  "S1 Teknik Penerbangan / Kedirgantaraan",
  "S1 Teknik Perkapalan",
  "S1 Teknik Biomedis",
  "S1 Arsitektur",
  "S1 Perencanaan Wilayah dan Kota (PWK / Planologi)",

  // Vokasi & Diploma (D3 / D4 / Sarjana Terapan)
  "D4 Teknik Informatika",
  "D4 Rekayasa Perangkat Lunak",
  "D4 Sistem Informasi Bisnis",
  "D4 Teknik Otomotif",
  "D4 Teknik Listrik",
  "D4 Teknik Konstruksi Gedung",
  "D4 Akuntansi Manajerial",
  "D4 Manajemen Pemasaran Internasional",
  "D4 Animasi & Desain Grafis",
  "D3 Akuntansi",
  "D3 Manajemen Informatika",
  "D3 Teknik Komputer",
  "D3 Teknik Mesin",
  "D3 Keperawatan",
  "D3 Kebidanan",
  "D3 Farmasi",
  "D3 Analis Kesehatan / Teknologi Laboratorium Medik",
  "D3 Penyiaran (Broadcasting)",
  "D3 Hubungan Masyarakat (Humas / PR)",
  "D3 Perpajakan",
  "D3 Keuangan dan Perbankan",
  "D3 Tata Boga / Culinary Arts",
  "D3 Perhotelan / Hospitality",

  // Kesehatan & Kedokteran
  "S1 Kedokteran (Pendidikan Dokter)",
  "S1 Kedokteran Gigi",
  "S1 Kedokteran Hewan",
  "S1 Farmasi",
  "S1 Ilmu Keperawatan",
  "S1 Kebidanan",
  "S1 Kesehatan Masyarakat (K3)",
  "S1 Ilmu Gizi",
  "S1 Psikologi",
  "Profesi Dokter",
  "Profesi Apoteker",

  // Ekonomi & Bisnis
  "S1 Manajemen",
  "S1 Akuntansi",
  "S1 Ekonomi Pembangunan",
  "S1 Ekonomi Syariah / Perbankan Syariah",
  "S1 Bisnis Digital",
  "S1 Kewirausahaan / Entrepreneurship",
  "S1 Keuangan dan Perbankan",
  "S1 Logistik / Manajemen Rantai Pasok",

  // Hukum, Sosial, Politik & Komunikasi
  "S1 Ilmu Hukum",
  "S1 Ilmu Komunikasi",
  "S1 Hubungan Internasional (HI)",
  "S1 Ilmu Pemerintahan",
  "S1 Administrasi Publik / Negara",
  "S1 Administrasi Bisnis / Niaga",
  "S1 Sosiologi",
  "S1 Criminology / Kriminologi",
  "S1 Ilmu Politik",
  "S1 Hubungan Masyarakat (Public Relations)",
  "S1 Jurnalistik / Penyiaran",

  // Seni, Desain & Sastra
  "S1 Desain Komunikasi Visual (DKV)",
  "S1 Desain Interior",
  "S1 Desain Produk",
  "S1 Seni Rupa Murni",
  "S1 Film dan Televisi",
  "S1 Sastra Inggris",
  "S1 Sastra Jepang",
  "S1 Sastra Mandarin / Bahasa Tiongkok",
  "S1 Sastra Arab",
  "S1 Bahasa & Kebudayaan Korea",
  "S1 Bahasa & Sastra Indonesia",

  // MIPA & Sains
  "S1 Matematika",
  "S1 Fisika",
  "S1 Kimia",
  "S1 Biologi",
  "S1 Bioteknologi",
  "S1 Statitiska / Aktuaria",
  "S1 Geofisika",
  "S1 Astronomi",
  "S1 Kelautan / Oceanografi",

  // Pendidikan (FKIP / Kependidikan)
  "S1 Pendidikan Guru Sekolah Dasar (PGSD)",
  "S1 Pendidikan Guru PAUD",
  "S1 Pendidikan Bahasa Inggris",
  "S1 Pendidikan Matematika",
  "S1 Pendidikan Bahasa Indonesia",
  "S1 Pendidikan Olahraga & Kesehatan (PJKR)",
  "S1 Bimbingan dan Konseling (BK)",
  "S1 Pendidikan IPA / Biologi / Fisika / Kimia",

  // Pertanian & Peternakan
  "S1 Agribisnis",
  "S1 Agroteknologi / Agronomi",
  "S1 Ilmu Tanah",
  "S1 Teknologi Pangan / Teknologi Hasil Pertanian",
  "S1 Kehutanan",
  "S1 Peternakan",
  "S1 Perikanan dan Kelautan",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "pt"; // "pt" or "prodi"
  const q = searchParams.get("q") || "";

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const queryClean = q.trim().toLowerCase();
  const encodedQuery = encodeURIComponent(q.trim());
  let liveResults: string[] = [];

  // Try Online Endpoints with short timeout (1.5 seconds)
  try {
    const endpoints =
      type === "pt"
        ? [
            `https://sivitas.rone.dev/search/pt/${encodedQuery}`,
            `https://api-pddikti.kemdiktisaintek.go.id/pencarian/pt/${encodedQuery}`,
            `https://api-pddikti.kemdikbud.go.id/pencarian/pt/${encodedQuery}`,
          ]
        : [
            `https://sivitas.rone.dev/search/prodi/${encodedQuery}`,
            `https://api-pddikti.kemdiktisaintek.go.id/pencarian/prodi/${encodedQuery}`,
            `https://api-pddikti.kemdikbud.go.id/pencarian/prodi/${encodedQuery}`,
          ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.data || data.results || [];
          if (Array.isArray(list) && list.length > 0) {
            liveResults = list
              .map((item: any) => {
                if (typeof item === "string") return item;
                if (type === "pt") {
                  return item.nama_pt || item.nama || item.text || item.pt_name;
                } else {
                  const ptName = item.nama_pt ? ` (${item.nama_pt})` : "";
                  const prodi = item.nama_prodi || item.nama || item.text || item.prodi_name;
                  return prodi ? `${prodi}${ptName}` : null;
                }
              })
              .filter(Boolean);

            if (liveResults.length > 0) {
              break; // Stop if we got valid live results
            }
          }
        }
      } catch (_) {
        // Continue trying next endpoint or fallback
      }
    }
  } catch (_) {
    // Ignore fetch errors
  }

  // Master Local Fuzzy Filter
  const sourceDataset = type === "pt" ? MASTER_PT : MASTER_PRODI;
  const localMatches = sourceDataset.filter((item) =>
    item.toLowerCase().includes(queryClean)
  );

  // Combine live results + local matches (remove duplicates)
  const combined = Array.from(new Set([...liveResults, ...localMatches]));

  // If query is custom and not found anywhere, offer custom text option
  if (combined.length === 0) {
    const customOption = type === "pt" ? q.trim() : `${q.trim()} (Lainnya)`;
    return NextResponse.json({ results: [customOption] });
  }

  return NextResponse.json({ results: combined.slice(0, 20) });
}
