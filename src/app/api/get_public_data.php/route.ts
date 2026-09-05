import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "stats";

    // 1. ACTION: PRESTASI (For [kawal_prestasi] shortcode)
    if (action === "prestasi") {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(searchParams.get("limit") || "20", 10));
      const skip = (page - 1) * limit;

      const [totalRows, rawData] = await Promise.all([
        prisma.prestasiSiswa.count(),
        prisma.prestasiSiswa.findMany({
          skip,
          take: limit,
          orderBy: { waktuPelaksanaan: "desc" },
          include: {
            anggota: {
              include: {
                siswa: true,
              },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalRows / limit) || 1;

      const data = rawData.map((p) => {
        const daftarSiswa = p.anggota.map((a) => a.siswa.nama).filter(Boolean).join(", ");
        return {
          id: p.id,
          nama_prestasi: p.namaPrestasi,
          deskripsi: p.catatan || "",
          jenis: p.jenisKepesertaan === "TIM" ? "Kelompok" : "Individu",
          nama_tim: p.namaTim || "",
          daftar_siswa: daftarSiswa || "-",
          waktu_pelaksanaan: p.waktuPelaksanaan
            ? p.waktuPelaksanaan.toISOString().split("T")[0]
            : "",
          penyelenggara: p.penyelenggara,
          tingkat: p.tingkat,
        };
      });

      return NextResponse.json(
        {
          status: "success",
          prestasi: {
            data,
            total_rows: totalRows,
            total_pages: totalPages,
            current_page: page,
            limit,
          },
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    // 2. ACTION: STATS (For [kawal_stats] shortcode)
    const allTracer = await prisma.tracerStudy.findMany({
      include: {
        siswa: {
          include: {
            riwayatKelas: {
              include: {
                tahunAjaran: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalResponden = allTracer.length;

    let kuliahCount = 0;
    let bekerjaCount = 0;
    let wirausahaCount = 0;
    let lainnyaCount = 0;

    const topUnivMap: Record<string, number> = {};
    const topProdiMap: Record<string, number> = {};
    const topBidangMap: Record<string, number> = {};

    const kuliahList: Array<{
      nama: string;
      tahun_lulus: string;
      institusi: string;
      jenjang: string;
      prodi: string;
      jalur: string;
    }> = [];

    const bekerjaList: Array<{
      nama: string;
      tahun_lulus: string;
      perusahaan: string;
      posisi: string;
      waktu_tunggu: string;
    }> = [];

    allTracer.forEach((item) => {
      const status = item.statusUtama;
      const namaSiswa = item.siswa?.nama || "Alumni";

      // Calculate tahun lulus from last riwayatKelas or createdAt year
      let tahunLulus = new Date(item.createdAt).getFullYear().toString();
      if (item.siswa?.riwayatKelas?.[0]?.tahunAjaran?.nama) {
        const taNama = item.siswa.riwayatKelas[0].tahunAjaran.nama;
        tahunLulus = taNama.split("/")[0] || tahunLulus;
      }

      if (status === "KULIAH") {
        kuliahCount++;

        const univ = item.namaPerguruanTinggi?.trim();
        if (univ) {
          topUnivMap[univ] = (topUnivMap[univ] || 0) + 1;
        }

        const prodi = item.fakultasProdi?.trim();
        if (prodi) {
          topProdiMap[prodi] = (topProdiMap[prodi] || 0) + 1;
        }

        kuliahList.push({
          nama: namaSiswa,
          tahun_lulus: tahunLulus,
          institusi: item.namaPerguruanTinggi || "-",
          jenjang: item.jenjangPendidikan || "-",
          prodi: item.fakultasProdi || "-",
          jalur: item.jalurMasuk || "-",
        });
      } else if (status === "BEKERJA") {
        bekerjaCount++;

        const bidang = item.bidangPekerjaan?.trim();
        if (bidang) {
          topBidangMap[bidang] = (topBidangMap[bidang] || 0) + 1;
        }

        bekerjaList.push({
          nama: namaSiswa,
          tahun_lulus: tahunLulus,
          perusahaan: item.namaPerusahaan || "-",
          posisi: item.posisiJabatan || "-",
          waktu_tunggu: item.waktuTungguKerja || "-",
        });
      } else if (status === "WIRAUSAHA") {
        wirausahaCount++;
      } else {
        lainnyaCount++;
      }
    });

    const calcPct = (count: number) =>
      totalResponden > 0 ? Math.round((count / totalResponden) * 1000) / 10 : 0;

    // Sort Maps by count descending for Top Universities, Top Prodi, Top Bidang
    const sortMap = (map: Record<string, number>, limit: number = 5) => {
      const entries = Object.entries(map);
      entries.sort((a, b) => b[1] - a[1]);
      const result: Record<string, number> = {};
      entries.slice(0, limit).forEach(([key, val]) => {
        result[key] = val;
      });
      return result;
    };

    const statsData = {
      total_responden: totalResponden,
      summary: {
        kuliah: {
          count: kuliahCount,
          pct: calcPct(kuliahCount),
        },
        bekerja: {
          count: bekerjaCount,
          pct: calcPct(bekerjaCount),
        },
        wirausaha: {
          count: wirausahaCount,
          pct: calcPct(wirausahaCount),
        },
        lainnya: {
          count: lainnyaCount,
          pct: calcPct(lainnyaCount),
        },
      },
      top_universitas: sortMap(topUnivMap, 5),
      top_prodi: sortMap(topProdiMap, 5),
      top_bidang: sortMap(topBidangMap, 5),
      kuliah_list: kuliahList,
      bekerja_list: bekerjaList,
    };

    return NextResponse.json(
      {
        status: "success",
        stats: statsData,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("Public API get_public_data error:", error);
    return NextResponse.json(
      { status: "error", message: `Gagal memuat data publik: ${error.message || error}` },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
