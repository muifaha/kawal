"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { Role, ViolationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// Guard helper untuk memastikan pemanggil adalah WAKA
async function assertWaka() {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    throw new Error("Akses ditolak. Tindakan ini hanya boleh dilakukan oleh Waka Kesiswaan.");
  }
  return user;
}

// 1. IMPORT GURU / STAFF
export interface UserImportRow {
  nip?: string;
  username: string;
  password?: string;
  nama: string;
  role: string;
  whatsappNumber?: string;
}

export async function importUsersAction(rows: UserImportRow[]) {
  try {
    await assertWaka();
    if (!rows || rows.length === 0) return { error: "Data impor kosong." };

    const usersToCreate = [];
    const seenUsernames = new Set<string>();
    const seenNips = new Set<string>();
    
    for (const row of rows) {
      const { nip, username, password, nama, role, whatsappNumber } = row;

      if (!username || !nama || !role) {
        return { error: `Baris dengan nama "${nama || 'Tanpa Nama'}" tidak valid. Username, Nama, dan Role wajib diisi.` };
      }

      const cleanUsername = username.trim();
      const cleanNip = nip ? String(nip).trim() : null;

      if (seenUsernames.has(cleanUsername)) {
        return { error: `Username "${cleanUsername}" ganda di dalam file Excel yang diunggah.` };
      }
      seenUsernames.add(cleanUsername);

      if (cleanNip && seenNips.has(cleanNip)) {
        return { error: `NIP "${cleanNip}" ganda di dalam file Excel yang diunggah.` };
      }
      if (cleanNip) seenNips.add(cleanNip);

      // Validasi Role
      const cleanRole = role.trim().toUpperCase();
      if (!["WAKA", "BK", "WALAS", "GURU", "OSIS"].includes(cleanRole)) {
        return { error: `Role "${role}" tidak valid. Gunakan salah satu dari: WAKA, BK, WALAS, GURU, OSIS.` };
      }

      // Check duplicate username in db
      const existingUser = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });
      if (existingUser) {
        return { error: `Username "${cleanUsername}" sudah terdaftar di sistem.` };
      }

      // Check duplicate NIP in db
      if (cleanNip) {
        const existingNip = await prisma.user.findUnique({
          where: { nip: cleanNip },
        });
        if (existingNip) {
          return { error: `NIP "${cleanNip}" sudah terdaftar di sistem.` };
        }
      }

      // Hashing password (default password if blank is username + '123')
      const rawPassword = password || `${cleanUsername}123`;
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      usersToCreate.push({
        nip: cleanNip,
        username: cleanUsername,
        passwordHash,
        nama: nama.trim(),
        role: cleanRole as Role,
        whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : null,
      });
    }

    // Run transaction
    await prisma.$transaction(
      usersToCreate.map((u) =>
        prisma.user.create({
          data: u,
        })
      )
    );

    revalidatePath("/kesiswaan");
    return { success: true, message: `Berhasil mengimpor ${rows.length} akun Guru/Staff.` };
  } catch (error: any) {
    console.error("Import users error:", error);
    return { error: error.message || "Gagal mengimpor data Guru." };
  }
}

// 2. IMPORT KELAS
export interface ClassImportRow {
  nama: string;
  walasUsername?: string;
  bkUsername?: string;
}

export async function importClassesAction(rows: ClassImportRow[]) {
  try {
    await assertWaka();
    if (!rows || rows.length === 0) return { error: "Data impor kosong." };

    // Get Active TA
    const activeTA = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });
    if (!activeTA) {
      return { error: "Tidak ada Tahun Ajaran aktif. Harap konfigurasikan terlebih dahulu." };
    }

    const classesToCreate = [];
    const seenClasses = new Set<string>();

    for (const row of rows) {
      const { nama, walasUsername, bkUsername } = row;
      if (!nama) {
        return { error: "Nama Kelas wajib diisi." };
      }

      const cleanName = nama.trim();
      if (seenClasses.has(cleanName)) {
        return { error: `Kelas "${cleanName}" ganda di dalam file Excel yang diunggah.` };
      }
      seenClasses.add(cleanName);

      // Check if class exists in db for active academic year
      const existingClass = await prisma.kelas.findFirst({
        where: { nama: cleanName, tahunAjaranId: activeTA.id }
      });
      if (existingClass) {
        return { error: `Kelas "${cleanName}" sudah terdaftar di sistem untuk Tahun Ajaran aktif.` };
      }

      let walasId: string | null = null;
      if (walasUsername) {
        const cleanWalasUsername = walasUsername.trim();
        const walasUser = await prisma.user.findFirst({
          where: { username: cleanWalasUsername, role: "WALAS" },
        });
        if (!walasUser) {
          return { error: `Wali kelas dengan username "${cleanWalasUsername}" tidak ditemukan atau bukan ber-role WALAS.` };
        }
        
        // Cek jika walas sudah menaungi kelas lain
        const classOccupied = await prisma.kelas.findFirst({
          where: { walasId: walasUser.id, tahunAjaranId: activeTA.id }
        });
        if (classOccupied) {
          return { error: `Guru "${walasUser.nama}" sudah menjadi Wali Kelas di "${classOccupied.nama}".` };
        }

        walasId = walasUser.id;
      }

      let bkId: string | null = null;
      if (bkUsername) {
        const cleanBkUsername = bkUsername.trim();
        const bkUser = await prisma.user.findFirst({
          where: { username: cleanBkUsername, role: "BK" },
        });
        if (!bkUser) {
          return { error: `Guru BK dengan username "${cleanBkUsername}" tidak ditemukan atau bukan ber-role BK.` };
        }
        bkId = bkUser.id;
      }

      classesToCreate.push({
        nama: cleanName,
        tahunAjaranId: activeTA.id,
        walasId,
        bkId,
      });
    }

    // Run transaction
    await prisma.$transaction(
      classesToCreate.map((c) =>
        prisma.kelas.create({
          data: c,
        })
      )
    );

    revalidatePath("/kesiswaan");
    revalidatePath("/absensi");
    return { success: true, message: `Berhasil mengimpor ${rows.length} data Kelas.` };
  } catch (error: any) {
    console.error("Import classes error:", error);
    return { error: error.message || "Gagal mengimpor data Kelas." };
  }
}

// 3. IMPORT SISWA
export interface StudentImportRow {
  nis: string;
  nama: string;
  kelasNama: string;
}

export async function importStudentsAction(rows: StudentImportRow[]) {
  try {
    await assertWaka();
    if (!rows || rows.length === 0) return { error: "Data impor kosong." };

    const activeTA = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });
    if (!activeTA) {
      return { error: "Tidak ada Tahun Ajaran aktif saat ini." };
    }

    const studentsToCreate: { id?: string; nis: string; nama: string; kelasId: string }[] = [];
    const seenNis = new Set<string>();

    // Cache Kelas untuk kecepatan query
    const kelasMap = new Map<string, string>(); // name -> id

    for (const row of rows) {
      const { nis, nama, kelasNama } = row;

      if (!nis || !nama || !kelasNama) {
        return { error: `Data siswa "${nama || 'Tanpa Nama'}" tidak valid. NIS, Nama, dan Kelas wajib diisi.` };
      }

      const cleanNis = String(nis).trim();
      const cleanKelasNama = kelasNama.trim();

      if (seenNis.has(cleanNis)) {
        return { error: `NIS "${cleanNis}" ganda di dalam file Excel yang diunggah.` };
      }
      seenNis.add(cleanNis);

      // Check cache kelas
      let kelasId = kelasMap.get(cleanKelasNama);
      if (!kelasId) {
        const dbClass = await prisma.kelas.findFirst({
          where: { nama: cleanKelasNama, tahunAjaran: { isActive: true } },
        });
        if (!dbClass) {
          return { error: `Kelas "${cleanKelasNama}" tidak ditemukan di sistem untuk Tahun Ajaran aktif.` };
        }
        kelasId = dbClass.id;
        kelasMap.set(cleanKelasNama, dbClass.id);
      }

      // Check unique NIS di database
      const existingStudent = await prisma.siswa.findUnique({
        where: { nis: cleanNis },
      });

      studentsToCreate.push({
        id: existingStudent ? existingStudent.id : undefined,
        nis: cleanNis,
        nama: nama.trim(),
        kelasId,
      });
    }

    // Run transaction
    await prisma.$transaction(async (tx) => {
      for (const s of studentsToCreate) {
        let studentId = s.id;
        if (studentId) {
          // Update siswa yang sudah ada (pastikan statusnya AKTIF)
          await tx.siswa.update({
            where: { id: studentId },
            data: {
              nama: s.nama,
              status: "AKTIF",
            },
          });
        } else {
          // Buat siswa baru
          const dbSiswa = await tx.siswa.create({
            data: {
              nis: s.nis,
              nama: s.nama,
              status: "AKTIF",
            },
          });
          studentId = dbSiswa.id;
        }

        // Catat/Update riwayat kelas di tahun pelajaran aktif
        await tx.siswaKelas.upsert({
          where: {
            siswaId_tahunAjaranId: {
              siswaId: studentId,
              tahunAjaranId: activeTA.id,
            },
          },
          update: {
            kelasId: s.kelasId,
          },
          create: {
            siswaId: studentId,
            kelasId: s.kelasId,
            tahunAjaranId: activeTA.id,
          },
        });
      }
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Berhasil mengimpor ${rows.length} data Siswa.` };
  } catch (error: any) {
    console.error("Import students error:", error);
    return { error: error.message || "Gagal mengimpor data Siswa." };
  }
}

// 4. IMPORT PELANGGARAN
export interface ViolationImportRow {
  kategoriNama: string;
  pelanggaranNama: string;
  poin: number;
}

export async function importViolationsAction(rows: ViolationImportRow[]) {
  try {
    await assertWaka();
    if (!rows || rows.length === 0) return { error: "Data impor kosong." };

    for (const row of rows) {
      const { kategoriNama, pelanggaranNama, poin } = row;
      const parsedPoin = Number(poin);

      if (!kategoriNama || !pelanggaranNama || isNaN(parsedPoin)) {
        return { error: `Baris "${pelanggaranNama || 'Tanpa Pelanggaran'}" tidak valid. Kategori, Pelanggaran, dan Poin wajib diisi secara benar.` };
      }

      // Dapatkan atau buat KategoriPelanggaran
      let category = await prisma.kategoriPelanggaran.findUnique({
        where: { nama: kategoriNama },
      });
      if (!category) {
        category = await prisma.kategoriPelanggaran.create({
          data: { nama: kategoriNama },
        });
      }

      // Buat detail pelanggaran
      await prisma.detailPelanggaran.create({
        data: {
          kategoriId: category.id,
          nama: pelanggaranNama,
          poin: parsedPoin,
        },
      });
    }

    revalidatePath("/kesiswaan");
    revalidatePath("/pelanggaran");
    return { success: true, message: `Berhasil mengimpor ${rows.length} jenis Pelanggaran.` };
  } catch (error: any) {
    console.error("Import violations error:", error);
    return { error: error.message || "Gagal mengimpor jenis pelanggaran." };
  }
}

// 5. IMPORT REMISI
export interface RemissionImportRow {
  nama: string;
  persentasePengurangan: number;
}

export async function importRemissionsAction(rows: RemissionImportRow[]) {
  try {
    await assertWaka();
    if (!rows || rows.length === 0) return { error: "Data impor kosong." };

    const remissionsToCreate = [];

    for (const row of rows) {
      const { nama, persentasePengurangan } = row;
      const parsedPercent = Number(persentasePengurangan);

      if (!nama || isNaN(parsedPercent)) {
        return { error: `Baris "${nama || 'Tanpa Nama'}" tidak valid. Nama Remisi dan Persentase wajib diisi.` };
      }

      remissionsToCreate.push({
        nama,
        persentasePengurangan: parsedPercent,
      });
    }

    // Run transaction
    await prisma.$transaction(
      remissionsToCreate.map((r) =>
        prisma.masterRemisi.upsert({
          where: { nama: r.nama },
          update: { persentasePengurangan: r.persentasePengurangan },
          create: { nama: r.nama, persentasePengurangan: r.persentasePengurangan },
        })
      )
    );

    revalidatePath("/kesiswaan");
    revalidatePath("/remisi");
    return { success: true, message: `Berhasil mengimpor ${rows.length} jenis Remisi.` };
  } catch (error: any) {
    console.error("Import remissions error:", error);
    return { error: error.message || "Gagal mengimpor jenis remisi." };
  }
}

// 6. MIGRATION POINTS IMPORT
export interface PointsMigrationImportRow {
  nama: string;
  kelasNama: string;
  poin: number;
  tanggal: string | number | Date;
}

function parseExcelDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // SheetJS sometimes reads dates as numbers. Excel serial date start: 30 Dec 1899
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const strVal = String(val).trim();
  const parsedMs = Date.parse(strVal);
  if (!isNaN(parsedMs)) return new Date(parsedMs);

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const dmy = strVal.split(/[-/]/);
  if (dmy.length === 3) {
    const d = parseInt(dmy[0], 10);
    const m = parseInt(dmy[1], 10) - 1;
    const y = parseInt(dmy[2], 10);
    if (y > 1000 && m >= 0 && m < 12 && d > 0 && d <= 31) {
      return new Date(y, m, d);
    }
  }
  return new Date();
}

export async function importPointsMigrationAction(rows: PointsMigrationImportRow[]) {
  try {
    const wakaUser = await assertWaka();
    if (!rows || rows.length === 0) return { error: "Data impor kosong." };

    const activeTA = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });
    if (!activeTA) {
      return { error: "Tidak ada Tahun Ajaran aktif saat ini." };
    }

    // Temukan atau buat KategoriPelanggaran MIGRASI
    let category = await prisma.kategoriPelanggaran.findUnique({
      where: { nama: "MIGRASI" },
    });
    if (!category) {
      category = await prisma.kategoriPelanggaran.create({
        data: { nama: "MIGRASI" },
      });
    }

    // Simpan semua proses ke dalam transaksi
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const { nama, kelasNama, poin, tanggal } = row;

        if (!nama || !kelasNama || !poin) {
          throw new Error("Format baris data tidak lengkap. Nama, Kelas, dan Poin wajib diisi.");
        }

        const parsedPoin = Math.max(1, Math.round(Number(poin)));
        if (isNaN(parsedPoin)) {
          throw new Error(`Nilai poin "${poin}" untuk siswa "${nama}" tidak valid.`);
        }

        const tanggalObj = parseExcelDate(tanggal);

        // Cari siswa yang aktif di kelas & tahun ajaran aktif saat ini
        const student = await tx.siswa.findFirst({
          where: {
            nama: {
              equals: nama.trim(),
              mode: "insensitive",
            },
            status: "AKTIF",
            riwayatKelas: {
              some: {
                kelas: {
                  nama: {
                    equals: kelasNama.trim(),
                    mode: "insensitive",
                  },
                },
                tahunAjaranId: activeTA.id,
              },
            },
          },
        });

        if (!student) {
          throw new Error(
            `Siswa bernama "${nama}" di kelas "${kelasNama}" tidak ditemukan di sistem untuk Tahun Ajaran aktif.`
          );
        }

        // Cari atau buat DetailPelanggaran di bawah kategori MIGRASI
        let detail = await tx.detailPelanggaran.findFirst({
          where: {
            kategoriId: category.id,
            nama: "Migrasi Poin Buku",
            poin: parsedPoin,
          },
        });
        if (!detail) {
          detail = await tx.detailPelanggaran.create({
            data: {
              kategoriId: category.id,
              nama: "Migrasi Poin Buku",
              poin: parsedPoin,
            },
          });
        }

        // Buat LaporanPelanggaran yang langsung APPROVED
        await tx.laporanPelanggaran.create({
          data: {
            siswaId: student.id,
            detailPelanggaranId: detail.id,
            pelaporId: wakaUser.id,
            status: "APPROVED",
            approverId: wakaUser.id,
            approvedAt: tanggalObj,
            tanggal: tanggalObj,
            notes: "Migrasi data poin lama dari buku.",
            isCensored: false,
          },
        });
      }
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    revalidatePath("/pelanggaran");
    return { success: true, message: `Berhasil mengimpor ${rows.length} data migrasi poin buku.` };
  } catch (error: any) {
    console.error("Import points migration error:", error);
    return { error: error.message || "Gagal mengimpor data migrasi poin." };
  }
}

