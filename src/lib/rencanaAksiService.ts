import { prisma } from "@/lib/prisma";

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
  guruId: string;
  // Duplicate keys with exact prompt casing for maximum API client compatibility
  "Nama Guru"?: string;
  "NIP"?: string;
  "Rencana Aksi"?: string;
  "Tanggal"?: string;
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

const CONSTANT_RENCANA_AKSI = "Melaksanakan pembelajaran/pembimbingan dalam mewujudkan pembelajaran yang bermutu";

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

    const kegiatanText = formatKegiatanMengajar(classNames);
    const totalJadwal = teacherSchedules.length;
    const totalJurnalTerisi = teacherJournals.length;

    const isComplete = totalJadwal > 0 && totalJurnalTerisi >= totalJadwal;
    const statusJurnal = totalJadwal === 0 ? "TIDAK_ADA_JADWAL" : isComplete ? "LENGKAP" : "BELUM_LENGKAP";

    // Generate PDF link if all journals for the day are filled
    let pdfLink: string | null = null;
    if (isComplete) {
      const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : "";
      pdfLink = `${cleanBaseUrl}/jurnal/cetak?guruId=${teacher.id}&tanggal=${targetDateStr}${tokenQuery}`;
    }

    const item: RencanaAksiItem = {
      guruId: teacher.id,
      namaGuru: teacher.nama,
      nip: teacher.nip || "-",
      rencanaAksi: CONSTANT_RENCANA_AKSI,
      tanggal: targetDateStr,
      jamMulai: "07.45",
      jamSelesai: "15.00",
      jam: "07.45 - 15.00",
      kegiatan: kegiatanText,
      realisasi: 1,
      buktiDukung: pdfLink,
      statusJurnal,
      totalJadwal,
      totalJurnalTerisi,
      // Duplicate casing for prompt exact keys
      "Nama Guru": teacher.nama,
      "NIP": teacher.nip || "-",
      "Rencana Aksi": CONSTANT_RENCANA_AKSI,
      "Tanggal": targetDateStr,
      "Jam": "07.45 - 15.00",
      "Kegiatan": kegiatanText,
      "Realisasi": 1,
      "Bukti Dukung": pdfLink,
    };

    // Filter out teachers who have no schedules on this day unless specifically requested by guruId/nip
    if (totalJadwal > 0 || guruIdFilter || nipFilter) {
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
