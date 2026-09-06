import * as XLSX from "xlsx";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

const dayMap: Record<string, number> = {
  SENIN: 1,
  SELASA: 2,
  RABU: 3,
  KAMIS: 4,
  JUMAT: 5,
  SABTU: 6,
};

function normalizeTeacherName(name: string): string {
  return name
    .replace(/(S\.Pd|M\.Pd|S\.Kom|S\.E|S\.H|S\.Sn|S\.Ag|Drs|Dra|Hj|H|M\.T|M\.TI|M\.Si)\.?/gi, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function generateUsername(name: string): string {
  const clean = normalizeTeacherName(name).toLowerCase();
  return clean ? `guru_${clean}` : `guru_${Date.now()}`;
}

function generateMapelCode(name: string, existingCodes: Set<string>): string {
  const words = name.trim().split(/\s+/);
  let baseCode = "";
  if (words.length >= 2) {
    baseCode = words.map((w) => w[0]).join("").toUpperCase();
  } else {
    baseCode = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5);
  }

  if (!baseCode) baseCode = "MAPEL";

  let candidate = `MP-${baseCode}`;
  let counter = 1;
  while (existingCodes.has(candidate)) {
    candidate = `MP-${baseCode}${counter}`;
    counter++;
  }
  existingCodes.add(candidate);
  return candidate;
}

export async function importJadwalFromExcel(filePath: string) {
  console.log(`🚀 Memulai import jadwal dari file: ${filePath}`);

  const wb = XLSX.readFile(filePath);

  // 1. Dapatkan atau buat Tahun Ajaran Aktif (Default: 2026/2027)
  let activeTa = await prisma.tahunAjaran.findFirst({
    where: { isActive: true },
  });

  if (!activeTa) {
    activeTa = await prisma.tahunAjaran.upsert({
      where: { nama: "2026/2027" },
      update: { isActive: true },
      create: {
        nama: "2026/2027",
        isActive: true,
        semesterAktif: "GANJIL",
      },
    });
  }

  console.log(`📌 Tahun Ajaran Aktif: ${activeTa.nama}`);

  // Default password hash untuk guru baru
  const defaultPasswordHash = await bcrypt.hash("guru123", 10);

  // Cache data dari database
  const existingUsers = await prisma.user.findMany();
  const existingMapel = await prisma.mataPelajaran.findMany();
  const existingKelas = await prisma.kelas.findMany({
    where: { tahunAjaranId: activeTa.id },
  });

  const userMapByNama = new Map<string, string>();
  const userMapByNormNama = new Map<string, string>();
  existingUsers.forEach((u) => {
    userMapByNama.set(u.nama.trim().toUpperCase(), u.id);
    userMapByNormNama.set(normalizeTeacherName(u.nama), u.id);
  });

  const mapelMapByNama = new Map<string, string>();
  const existingMapelCodes = new Set<string>();
  existingMapel.forEach((m) => {
    mapelMapByNama.set(m.nama.trim().toUpperCase(), m.id);
    existingMapelCodes.add(m.kode);
  });

  const kelasMapByNama = new Map<string, string>();
  existingKelas.forEach((k) => kelasMapByNama.set(k.nama.trim().toUpperCase(), k.id));

  let createdGuruCount = 0;
  let createdMapelCount = 0;
  let createdKelasCount = 0;
  let totalJadwalCreated = 0;

  // Process all class sheets
  for (const sheetName of wb.SheetNames) {
    if (sheetName.toUpperCase() === "DAFTAR KELAS") continue;

    const className = sheetName.trim();
    if (!className) continue;

    // Ensure Kelas exists
    let kelasId = kelasMapByNama.get(className.toUpperCase());
    if (!kelasId) {
      const newKelas = await prisma.kelas.create({
        data: {
          nama: className,
          tahunAjaranId: activeTa.id,
        },
      });
      kelasId = newKelas.id;
      kelasMapByNama.set(className.toUpperCase(), kelasId);
      createdKelasCount++;
    }

    // Clear existing schedule for this class
    await prisma.jadwalPelajaran.deleteMany({
      where: { kelasId },
    });

    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    let currentDay = 1;

    for (const row of json) {
      if (!row || row.length === 0) continue;

      const cell0 = String(row[0] || "").trim().toUpperCase();
      if (dayMap[cell0]) {
        currentDay = dayMap[cell0];
      }

      const jamKeVal = row[1];
      const waktuVal = String(row[2] || "").trim();
      const guruVal = String(row[3] || "").trim();
      const mapelVal = String(row[4] || "").trim();

      if (
        cell0 === "HARI" ||
        waktuVal.toUpperCase() === "WAKTU" ||
        guruVal.toUpperCase() === "GURU"
      ) {
        continue;
      }

      // Check special activity / break
      const isSpecialActivity = [
        "UPACARA",
        "ISTIRAHAT",
        "ISHOMA",
        "BUDAYA BERSIH DAN SEHAT",
        "BUDAYA LITERASI",
        "BUDAYA APRESIASI SENI",
        "BUDAYA RELIGI",
      ].some(
        (act) =>
          guruVal.toUpperCase().includes(act) || mapelVal.toUpperCase().includes(act)
      );

      if (isSpecialActivity || jamKeVal === "-" || !jamKeVal) {
        continue;
      }

      const jamKe = parseInt(String(jamKeVal), 10);
      if (isNaN(jamKe) || !guruVal || !mapelVal) continue;

      // Ensure Guru (User) exists
      let guruId =
        userMapByNama.get(guruVal.toUpperCase()) ||
        userMapByNormNama.get(normalizeTeacherName(guruVal));
      if (!guruId) {
        const username = generateUsername(guruVal);
        const newGuru = await prisma.user.create({
          data: {
            username,
            passwordHash: defaultPasswordHash,
            nama: guruVal,
            role: "GURU",
          },
        });
        guruId = newGuru.id;
        userMapByNama.set(guruVal.toUpperCase(), guruId);
        userMapByNormNama.set(normalizeTeacherName(guruVal), guruId);
        createdGuruCount++;
      }

      // Ensure MataPelajaran exists
      let mapelId = mapelMapByNama.get(mapelVal.toUpperCase());
      if (!mapelId) {
        const kode = generateMapelCode(mapelVal, existingMapelCodes);
        const newMapel = await prisma.mataPelajaran.create({
          data: {
            kode,
            nama: mapelVal,
          },
        });
        mapelId = newMapel.id;
        mapelMapByNama.set(mapelVal.toUpperCase(), mapelId);
        createdMapelCount++;
      }

      // Create JadwalPelajaran entry
      await prisma.jadwalPelajaran.create({
        data: {
          kelasId,
          guruId,
          mapelId,
          hari: currentDay,
          jamMulai: jamKe,
          jamSelesai: jamKe,
        },
      });

      totalJadwalCreated++;
    }
  }

  console.log("\n✅ IMPORT JADWAL BERHASIL SESELESAI!");
  console.log(`-----------------------------------`);
  console.log(`- Kelas Baru Dibuat        : ${createdKelasCount}`);
  console.log(`- Akun Guru Baru Dibuat    : ${createdGuruCount}`);
  console.log(`- Mata Pelajaran Baru      : ${createdMapelCount}`);
  console.log(`- Total Slot Jadwal Dibuat : ${totalJadwalCreated}`);
  console.log(`-----------------------------------`);

  return {
    success: true,
    createdKelasCount,
    createdGuruCount,
    createdMapelCount,
    totalJadwalCreated,
  };
}

// Allow direct CLI execution
if (require.main === module) {
  const filePath = process.argv[2] || "/home/muifaha/Project/kawal/JADWAL_PER_KELAS.xlsx";
  importJadwalFromExcel(filePath)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error importing jadwal:", err);
      process.exit(1);
    });
}
