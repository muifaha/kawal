import { prisma } from "@/lib/prisma";

export const RENCANA_AKSI_OPTIONS = [
  "Melaksanakan pembelajaran/pembimbingan dalam mewujudkan pembelajaran yang bermutu",
  "Melaksanakan pembimbingan dan pelatihan dalam mewujudkan pembelajaran yang bermutu untuk semua",
  "Melaksanakan perencanaan pembelajaran/pembimbingan dalam mewujudkan pembelajaran yang bermutu untuk semua",
  "Melaksanakan pengembangan kompetensi yang meningkatkan pembelajaran yang bermutu untuk semua",
  "Melaksanakan praktik pembelajaran melalui observasi praktik kinerja yang disepakati bersama Kepala Sekolah yang berfokus pada Aktivitas Interaktif",
  "Melaksanakan tugas tambahan dalam mendukung pembelajaran yang bermutu untuk semua",
  "Melaksanakan penilaian pembelajaran atau evaluasi bimbingan dalam mewujudkan pembelajaran yang bermutu untuk semua",
];

export interface KegiatanTambahanDetail {
  id: string;
  namaJurnal: string;
  kegiatan: string;
  jamMulai: string;
  jamSelesai: string;
  jam: string;
  waktu: string;
  rencanaAksi: string | null;
  foto: string | null;
  fotoKeterangan: string | null;
  kelas: string;
  mapel: string;
  tipe: string;
  buktiDukung: string | null;
  // Duplicate keys with exact prompt casing for maximum API client compatibility
  "Nama Jurnal"?: string;
  "Kegiatan"?: string;
  "Jam Mulai"?: string;
  "Jam Selesai"?: string;
  "Jam"?: string;
  "Waktu"?: string;
  "Rencana Aksi"?: string | null;
  "Foto"?: string | null;
  "Foto Keterangan"?: string | null;
  "Kelas"?: string;
  "Mapel"?: string;
  "Tipe"?: string;
  "Bukti Dukung"?: string | null;
}

export interface RencanaAksiItem {
  namaGuru: string;
  nip: string;
  rencanaAksi: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  jam: string;
  kegiatan: string;
  realisasi: number;
  buktiDukung: string | null;
  statusJurnal: "LENGKAP" | "BELUM_LENGKAP" | "TIDAK_ADA_JADWAL";
  totalJadwal: number;
  totalJurnalTerisi: number;
  kegiatanTambahan?: KegiatanTambahanDetail[];
  guruId: string;
  // Duplicate keys with exact prompt casing for maximum API client compatibility
  "Nama Guru"?: string;
  "NIP"?: string;
  "Rencana Aksi"?: string;
  "Tanggal"?: string;
  "Jam Mulai"?: string;
  "Jam Selesai"?: string;
  "Jam"?: string;
  "Kegiatan"?: string;
  "Realisasi"?: number;
  "Bukti Dukung"?: string | null;
}

export function formatKegiatanMengajar(kelases: string[]): string {
  const uniqueKelases = Array.from(new Set(kelases)).filter(Boolean);
  if (uniqueKelases.length === 0) {
    return "Tidak ada jadwal mengajar pada tanggal ini";
  }
  if (uniqueKelases.length === 1) {
    return `Mengajar di kelas ${uniqueKelases[0]}`;
  }
  if (uniqueKelases.length === 2) {
    return `Mengajar di kelas ${uniqueKelases[0]} dan ${uniqueKelases[1]}`;
  }
  const last = uniqueKelases[uniqueKelases.length - 1];
  const rest = uniqueKelases.slice(0, uniqueKelases.length - 1).join(", ");
  return `Mengajar di kelas ${rest} dan ${last}`;
}

export function extractTimeInfo(namaJurnal: string): { jamMulai: string; jamSelesai: string; jam: string; cleanNamaJurnal: string } {
  // Regex to match (HH:MM - HH:MM) or (HH.MM - HH.MM) or any time pattern inside trailing parentheses
  const parenMatch = namaJurnal.match(/\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const inner = parenMatch[1].trim();
    const timeParts = inner.split(/\s*[-–]\s*/);
    if (timeParts.length === 2 && /^\d{1,2}[:.]\d{2}$/.test(timeParts[0]) && /^\d{1,2}[:.]\d{2}$/.test(timeParts[1])) {
      const jamMulai = timeParts[0].replace(":", ".");
      const jamSelesai = timeParts[1].replace(":", ".");
      const cleanNamaJurnal = namaJurnal.replace(parenMatch[0], "").trim();
      return {
        jamMulai,
        jamSelesai,
        jam: `${jamMulai} - ${jamSelesai}`,
        cleanNamaJurnal,
      };
    } else if (inner) {
      const cleanNamaJurnal = namaJurnal.replace(parenMatch[0], "").trim();
      return {
        jamMulai: inner,
        jamSelesai: inner,
        jam: inner,
        cleanNamaJurnal,
      };
    }
  }
  return {
    jamMulai: "07.45",
    jamSelesai: "15.00",
    jam: "07.45 - 15.00",
    cleanNamaJurnal: namaJurnal,
  };
}

const CONSTANT_RENCANA_AKSI = RENCANA_AKSI_OPTIONS[0];

export async function getRencanaAksiSingleDate(
  targetDateStr: string,
  teachers: Array<{ id: string; nama: string; nip: string | null; username: string }>,
  baseUrl: string,
  guruIdFilter?: string,
  nipFilter?: string,
  token?: string
): Promise<RencanaAksiItem[]> {
  const dateObj = new Date(`${targetDateStr}T12:00:00.000Z`);
  const jsDay = dateObj.getUTCDay();
  const dayNumber = jsDay === 0 ? 7 : jsDay; // 1 = Senin, ... 7 = Minggu

  const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

  const teacherIds = teachers.map((t) => t.id);

  // Fetch schedules for these teachers on dayNumber
  const schedules = await prisma.jadwalPelajaran.findMany({
    where: {
      guruId: { in: teacherIds },
      hari: dayNumber,
    },
    include: {
      kelas: true,
      mapel: true,
    },
    orderBy: { jamMulai: "asc" },
  });

  // Fetch journals for these teachers on target date range
  const journals = await prisma.jurnalMengajar.findMany({
    where: {
      guruId: { in: teacherIds },
      tanggal: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      kelas: true,
      mapel: true,
    },
  });

  // Group schedules and journals by guruId
  const schedulesByGuru = new Map<string, typeof schedules>();
  for (const s of schedules) {
    const list = schedulesByGuru.get(s.guruId) || [];
    list.push(s);
    schedulesByGuru.set(s.guruId, list);
  }

  const journalsByGuru = new Map<string, typeof journals>();
  for (const j of journals) {
    const list = journalsByGuru.get(j.guruId) || [];
    list.push(j);
    journalsByGuru.set(j.guruId, list);
  }

  const result: RencanaAksiItem[] = [];

  for (const teacher of teachers) {
    const teacherSchedules = schedulesByGuru.get(teacher.id) || [];
    const teacherJournals = journalsByGuru.get(teacher.id) || [];

    // Extract unique class names in order of schedule
    const classNames: string[] = [];
    for (const sched of teacherSchedules) {
      if (sched.kelas?.nama && !classNames.includes(sched.kelas.nama)) {
        classNames.push(sched.kelas.nama);
      }
    }

    const baseKegiatanText = formatKegiatanMengajar(classNames);
    const totalJadwal = teacherSchedules.length;
    const totalJurnalTerisi = teacherJournals.length;

    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : "";

    // Detect Jurnal Kegiatan Tambahan (Custom activity journals)
    const customActivityJournals = teacherJournals.filter(
      (j) => !j.jadwalId || j.kelas?.nama === "KEGIATAN UMUM" || j.mapel?.nama === "Kegiatan Pembelajaran"
    );

    const listKegiatanTambahan: KegiatanTambahanDetail[] = customActivityJournals.map((j) => {
      const timeInfo = extractTimeInfo(j.namaJurnal);
      const namaKelas = j.kelas?.nama || "KEGIATAN UMUM";
      const namaMapel = j.mapel?.nama || "Kegiatan Pembelajaran";
      const singleBuktiLink = `${cleanBaseUrl}/jurnal/cetak?guruId=${teacher.id}&tanggal=${targetDateStr}&jurnalId=${j.id}${tokenQuery}`;
      return {
        id: j.id,
        namaJurnal: timeInfo.cleanNamaJurnal,
        kegiatan: j.kegiatan,
        jamMulai: timeInfo.jamMulai,
        jamSelesai: timeInfo.jamSelesai,
        jam: timeInfo.jam,
        waktu: timeInfo.jam,
        rencanaAksi: j.rencanaAksi || null,
        foto: j.foto || null,
        fotoKeterangan: j.fotoKeterangan || null,
        kelas: namaKelas,
        mapel: namaMapel,
        tipe: "KEGIATAN_TAMBAHAN",
        buktiDukung: singleBuktiLink,
        "Nama Jurnal": timeInfo.cleanNamaJurnal,
        "Kegiatan": j.kegiatan,
        "Jam Mulai": timeInfo.jamMulai,
        "Jam Selesai": timeInfo.jamSelesai,
        "Jam": timeInfo.jam,
        "Waktu": timeInfo.jam,
        "Rencana Aksi": j.rencanaAksi || null,
        "Foto": j.foto || null,
        "Foto Keterangan": j.fotoKeterangan || null,
        "Kelas": namaKelas,
        "Mapel": namaMapel,
        "Tipe": "KEGIATAN_TAMBAHAN",
        "Bukti Dukung": singleBuktiLink,
      };
    });

    let combinedKegiatan = baseKegiatanText;
    if (customActivityJournals.length > 0) {
      const customTitles = listKegiatanTambahan
        .map((k) => `${k.namaJurnal} (${k.jam}) - ${k.kegiatan}`)
        .join("; ");
      if (totalJadwal === 0 || baseKegiatanText === "Tidak ada jadwal mengajar pada tanggal ini") {
        combinedKegiatan = `Kegiatan Tambahan: ${customTitles}`;
      } else {
        combinedKegiatan = `${baseKegiatanText}; Kegiatan Tambahan: ${customTitles}`;
      }
    }

    // Determine top-level jam values
    let topJamMulai = "07.45";
    let topJamSelesai = "15.00";
    let topJam = "07.45 - 15.00";

    if (totalJadwal === 0 && listKegiatanTambahan.length > 0) {
      topJamMulai = listKegiatanTambahan[0].jamMulai;
      topJamSelesai = listKegiatanTambahan[0].jamSelesai;
      topJam = listKegiatanTambahan[0].jam;
    }

    // Use teacher's selected rencanaAksi if stored in journal, or fallback default
    const customRencanaAksi = teacherJournals.find((j) => j.rencanaAksi)?.rencanaAksi;
    const activeRencanaAksi = customRencanaAksi || CONSTANT_RENCANA_AKSI;

    const isComplete = (totalJadwal > 0 && totalJurnalTerisi >= totalJadwal) || (totalJadwal === 0 && customActivityJournals.length > 0);
    const statusJurnal = (totalJadwal === 0 && customActivityJournals.length === 0) ? "TIDAK_ADA_JADWAL" : isComplete ? "LENGKAP" : "BELUM_LENGKAP";

    // Generate PDF link:
    // If teacher has KBM schedules, top-level buktiDukung links to KBM print view (`tipe=kbm`)
    // If teacher has NO KBM schedules but has custom activities, top-level buktiDukung links to custom activities print view (`tipe=tambahan`)
    let pdfLink: string | null = null;
    if (isComplete) {
      if (totalJadwal > 0) {
        pdfLink = `${cleanBaseUrl}/jurnal/cetak?guruId=${teacher.id}&tanggal=${targetDateStr}&tipe=kbm${tokenQuery}`;
      } else {
        pdfLink = `${cleanBaseUrl}/jurnal/cetak?guruId=${teacher.id}&tanggal=${targetDateStr}&tipe=tambahan${tokenQuery}`;
      }
    }

    const item: RencanaAksiItem = {
      guruId: teacher.id,
      namaGuru: teacher.nama,
      nip: teacher.nip || "-",
      rencanaAksi: activeRencanaAksi,
      tanggal: targetDateStr,
      jamMulai: topJamMulai,
      jamSelesai: topJamSelesai,
      jam: topJam,
      kegiatan: combinedKegiatan,
      realisasi: 1,
      buktiDukung: pdfLink,
      statusJurnal,
      totalJadwal,
      totalJurnalTerisi,
      kegiatanTambahan: listKegiatanTambahan,
      // Duplicate casing for prompt exact keys
      "Nama Guru": teacher.nama,
      "NIP": teacher.nip || "-",
      "Rencana Aksi": activeRencanaAksi,
      "Tanggal": targetDateStr,
      "Jam Mulai": topJamMulai,
      "Jam Selesai": topJamSelesai,
      "Jam": topJam,
      "Kegiatan": combinedKegiatan,
      "Realisasi": 1,
      "Bukti Dukung": pdfLink,
    };

    // Include teacher if they have schedules, custom activities, or if specifically filtered
    if (totalJadwal > 0 || customActivityJournals.length > 0 || guruIdFilter || nipFilter) {
      result.push(item);
    }
  }

  return result;
}

export async function getRencanaAksiData(options: {
  tanggalStr?: string;
  dariStr?: string;
  sampaiStr?: string;
  bulanStr?: string;
  guruId?: string;
  nip?: string;
  search?: string;
  baseUrl?: string;
  token?: string;
}): Promise<RencanaAksiItem[]> {
  const { tanggalStr, dariStr, sampaiStr, bulanStr, guruId, nip, search, baseUrl = "", token } = options;

  // Build user filter
  const userWhere: any = {
    role: { in: ["GURU", "WALAS"] },
  };

  if (guruId) {
    userWhere.id = guruId;
  } else if (nip) {
    userWhere.nip = nip;
  } else if (search) {
    userWhere.OR = [
      { nama: { contains: search, mode: "insensitive" } },
      { nip: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  // Fetch target teachers
  const teachers = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      nama: true,
      nip: true,
      username: true,
    },
    orderBy: { nama: "asc" },
  });

  if (teachers.length === 0) {
    return [];
  }

  // Determine list of dates to process
  const datesToProcess: string[] = [];

  if (bulanStr && /^\d{4}-\d{2}$/.test(bulanStr)) {
    const [year, month] = bulanStr.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      const monthStr = String(month).padStart(2, "0");
      datesToProcess.push(`${year}-${monthStr}-${dayStr}`);
    }
  } else if (dariStr && sampaiStr && /^\d{4}-\d{2}-\d{2}$/.test(dariStr) && /^\d{4}-\d{2}-\d{2}$/.test(sampaiStr)) {
    let curr = new Date(`${dariStr}T12:00:00.000Z`);
    const end = new Date(`${sampaiStr}T12:00:00.000Z`);
    let count = 0;
    while (curr <= end && count < 62) {
      const dStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(curr);
      datesToProcess.push(dStr);
      curr.setDate(curr.getDate() + 1);
      count++;
    }
  } else if (tanggalStr && /^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)) {
    datesToProcess.push(tanggalStr);
  } else {
    // Default to today
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    datesToProcess.push(todayStr);
  }

  const allResults: RencanaAksiItem[] = [];

  for (const dateStr of datesToProcess) {
    const items = await getRencanaAksiSingleDate(dateStr, teachers, baseUrl, guruId, nip, token);
    allResults.push(...items);
  }

  return allResults;
}
