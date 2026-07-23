"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { Role, ViolationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

// Guard helper untuk memastikan pemanggil adalah WAKA
async function assertWaka() {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    throw new Error("Akses ditolak. Tindakan ini hanya boleh dilakukan oleh Waka Kesiswaan.");
  }
  return user;
}

// ==========================================
// 1. MANAJEMEN USER (GURU / STAFF)
// ==========================================

export async function createUserAction(formData: FormData) {
  try {
    await assertWaka();
    const nip = formData.get("nip") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const nama = formData.get("nama") as string;
    const role = formData.get("role") as Role;
    const whatsappNumber = formData.get("whatsappNumber") as string;

    if (!username || !password || !nama || !role) {
      return { error: "Semua kolom wajib diisi (kecuali NIP dan WhatsApp)." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        nip: nip || null,
        username,
        passwordHash,
        nama,
        role,
        whatsappNumber: whatsappNumber || null,
      },
    });

    revalidatePath("/kesiswaan");
    return { success: true, message: `Akun Guru/Staff *${nama}* berhasil dibuat.` };
  } catch (error: any) {
    console.error("Create user error:", error);
    if (error.code === "P2002") {
      return { error: "Username sudah digunakan oleh akun lain." };
    }
    return { error: error.message || "Gagal membuat akun." };
  }
}

export async function deleteUserAction(userId: string) {
  try {
    await assertWaka();

    // Pastikan tidak menghapus akun sendiri
    const currentUser = await getSessionUser();
    if (currentUser?.id === userId) {
      return { error: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif." };
    }

    // Set walasId menjadi null pada kelas yang dikelolanya terlebih dahulu (agar tidak terjadi error foreign key)
    await prisma.kelas.updateMany({
      where: { walasId: userId },
      data: { walasId: null },
    });

    const deleted = await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/kesiswaan");
    return { success: true, message: `Akun *${deleted.nama}* berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete user error:", error);
    return { error: error.message || "Gagal menghapus akun." };
  }
}

// ==========================================
// 2. MANAJEMEN KELAS
// ==========================================

export async function createKelasAction(formData: FormData) {
  try {
    await assertWaka();
    const nama = formData.get("nama") as string;
    const walasId = formData.get("walasId") as string;
    const bkId = formData.get("bkId") as string;

    if (!nama) {
      return { error: "Nama kelas wajib diisi." };
    }

    // Dapatkan Tahun Ajaran Aktif
    const activeTA = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });

    if (!activeTA) {
      return { error: "Tidak ada Tahun Ajaran aktif. Silakan aktifkan Tahun Ajaran terlebih dahulu." };
    }

    await prisma.kelas.create({
      data: {
        nama,
        tahunAjaranId: activeTA.id,
        walasId: walasId || null,
        bkId: bkId || null,
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/absensi");
    return { success: true, message: `Kelas *${nama}* berhasil dibuat.` };
  } catch (error: any) {
    console.error("Create kelas error:", error);
    return { error: error.message || "Gagal membuat kelas." };
  }
}

export async function deleteKelasAction(kelasId: string) {
  try {
    await assertWaka();

    // Untuk keamanan integritas data (Cascade manual untuk test):
    // 1. Ambil semua siswa di kelas ini melalui SiswaKelas
    const studentRosters = await prisma.siswaKelas.findMany({ where: { kelasId } });
    const studentIds = studentRosters.map((s) => s.siswaId);

    // 2. Hapus semua riwayat relasi siswa-siswa tersebut
    await prisma.absensi.deleteMany({ where: { siswaId: { in: studentIds } } });
    await prisma.laporanPelanggaran.deleteMany({ where: { siswaId: { in: studentIds } } });
    await prisma.transaksiRemisi.deleteMany({ where: { siswaId: { in: studentIds } } });
    await prisma.siswaKelas.deleteMany({ where: { kelasId } });

    // 3. Hapus siswanya
    await prisma.siswa.deleteMany({ where: { id: { in: studentIds } } });

    // 4. Hapus kelasnya
    const deleted = await prisma.kelas.delete({
      where: { id: kelasId },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/absensi");
    return { success: true, message: `Kelas *${deleted.nama}* beserta seluruh siswanya berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete kelas error:", error);
    return { error: error.message || "Gagal menghapus kelas." };
  }
}

// ==========================================
// 3. MANAJEMEN SISWA
// ==========================================

export async function createSiswaAction(formData: FormData) {
  try {
    await assertWaka();
    const nis = formData.get("nis") as string;
    const nama = formData.get("nama") as string;
    const kelasId = formData.get("kelasId") as string;

    if (!nis || !nama || !kelasId) {
      return { error: "NIS, Nama, dan Kelas wajib diisi." };
    }

    const activeTA = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });
    if (!activeTA) {
      return { error: "Tidak ada Tahun Ajaran aktif saat ini." };
    }

    await prisma.$transaction(async (tx) => {
      const newSiswa = await tx.siswa.create({
        data: {
          nis,
          nama,
          status: "AKTIF",
        },
      });

      await tx.siswaKelas.create({
        data: {
          siswaId: newSiswa.id,
          kelasId,
          tahunAjaranId: activeTA.id,
        },
      });
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Siswa *${nama}* (${nis}) berhasil didaftarkan.` };
  } catch (error: any) {
    console.error("Create siswa error:", error);
    if (error.code === "P2002") {
      return { error: "NIS sudah digunakan oleh siswa lain." };
    }
    return { error: error.message || "Gagal mendaftarkan siswa." };
  }
}

export async function deleteSiswaAction(siswaId: string) {
  try {
    await assertWaka();

    // Hapus seluruh transaksi relasi siswa (Cascade manual untuk test)
    await prisma.absensi.deleteMany({ where: { siswaId } });
    await prisma.laporanPelanggaran.deleteMany({ where: { siswaId } });
    await prisma.transaksiRemisi.deleteMany({ where: { siswaId } });

    const deleted = await prisma.siswa.delete({
      where: { id: siswaId },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Siswa *${deleted.nama}* berhasil dihapus dari sistem.` };
  } catch (error: any) {
    console.error("Delete siswa error:", error);
    return { error: error.message || "Gagal menghapus siswa." };
  }
}

// ==========================================
// 4. MANAJEMEN JENIS PELANGGARAN
// ==========================================

export async function createViolationItemAction(formData: FormData) {
  try {
    await assertWaka();
    const isNewCategory = formData.get("isNewCategory") === "true";
    const categoryName = formData.get("categoryName") as string;
    const categoryId = formData.get("categoryId") as string;
    const detailName = formData.get("detailName") as string;
    const points = parseFloat(formData.get("points") as string);

    if (!detailName || isNaN(points)) {
      return { error: "Nama pelanggaran dan bobot poin wajib diisi secara valid." };
    }

    let finalCategoryId = categoryId;

    // Jika membuat kategori baru
    if (isNewCategory) {
      if (!categoryName) {
        return { error: "Nama kategori baru wajib diisi." };
      }
      const newCat = await prisma.kategoriPelanggaran.create({
        data: { nama: categoryName },
      });
      finalCategoryId = newCat.id;
    } else {
      if (!categoryId) {
        return { error: "Kategori wajib dipilih." };
      }
    }

    const newItem = await prisma.detailPelanggaran.create({
      data: {
        kategoriId: finalCategoryId,
        nama: detailName,
        poin: points,
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/pelanggaran");
    return { success: true, message: `Jenis pelanggaran *${newItem.nama}* (+${newItem.poin} Poin) berhasil ditambahkan.` };
  } catch (error: any) {
    console.error("Create violation item error:", error);
    if (error.code === "P2002") {
      return { error: "Nama kategori pelanggaran sudah ada." };
    }
    return { error: error.message || "Gagal membuat jenis pelanggaran." };
  }
}

export async function deleteViolationItemAction(detailId: string) {
  try {
    await assertWaka();

    // Hapus laporan pelanggaran yang merujuk ke detail ini terlebih dahulu
    await prisma.laporanPelanggaran.deleteMany({ where: { detailPelanggaranId: detailId } });

    const deleted = await prisma.detailPelanggaran.delete({
      where: { id: detailId },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/pelanggaran");
    return { success: true, message: `Jenis pelanggaran *${deleted.nama}* berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete violation item error:", error);
    return { error: error.message || "Gagal menghapus jenis pelanggaran." };
  }
}

export async function updateCategoryAction(categoryId: string, name: string) {
  try {
    await assertWaka();
    if (!name) {
      return { error: "Nama kategori wajib diisi." };
    }

    const updated = await prisma.kategoriPelanggaran.update({
      where: { id: categoryId },
      data: { nama: name },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/pelanggaran");
    return { success: true, message: `Kategori pelanggaran berhasil diubah menjadi *${updated.nama}*.` };
  } catch (error: any) {
    console.error("Update category error:", error);
    return { error: error.message || "Gagal memperbarui kategori." };
  }
}

export async function deleteCategoryAction(categoryId: string) {
  try {
    await assertWaka();

    // 1. Ambil semua detail pelanggaran di bawah kategori ini
    const details = await prisma.detailPelanggaran.findMany({
      where: { kategoriId: categoryId },
    });
    const detailIds = details.map((d) => d.id);

    await prisma.$transaction(async (tx) => {
      // 2. Hapus semua laporan pelanggaran yang merujuk ke detail-detail tersebut
      if (detailIds.length > 0) {
        await tx.laporanPelanggaran.deleteMany({
          where: { detailPelanggaranId: { in: detailIds } },
        });
      }

      // 3. Hapus detail pelanggaran
      await tx.detailPelanggaran.deleteMany({
        where: { kategoriId: categoryId },
      });

      // 4. Hapus kategori itu sendiri
      await tx.kategoriPelanggaran.delete({
        where: { id: categoryId },
      });
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/pelanggaran");
    return { success: true, message: `Kategori pelanggaran beserta seluruh jenis pelanggaran di bawahnya berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete category error:", error);
    return { error: error.message || "Gagal menghapus kategori." };
  }
}

// ==========================================
// 5. MANAJEMEN MASTER REMISI
// ==========================================

export async function createRemissionItemAction(formData: FormData) {
  try {
    await assertWaka();
    const nama = formData.get("nama") as string;
    const persentase = parseInt(formData.get("persentase") as string, 10);

    if (!nama || isNaN(persentase)) {
      return { error: "Nama remisi dan persentase wajib diisi." };
    }

    await prisma.masterRemisi.create({
      data: {
        nama,
        persentasePengurangan: persentase,
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/remisi");
    return { success: true, message: `Jenis remisi *${nama}* (${persentase}%) berhasil dibuat.` };
  } catch (error: any) {
    console.error("Create remission item error:", error);
    if (error.code === "P2002") {
      return { error: "Nama remisi sudah digunakan." };
    }
    return { error: error.message || "Gagal membuat jenis remisi." };
  }
}

export async function deleteRemissionItemAction(remissionId: string) {
  try {
    await assertWaka();

    // Hapus transaksi remisi yang merujuk ke master remisi ini
    await prisma.transaksiRemisi.deleteMany({ where: { masterRemisiId: remissionId } });

    const deleted = await prisma.masterRemisi.delete({
      where: { id: remissionId },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/remisi");
    return { success: true, message: `Jenis remisi *${deleted.nama}* berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete remission item error:", error);
    return { error: error.message || "Gagal menghapus jenis remisi." };
  }
}

// ==========================================
// 6. MANAJEMEN HARI LIBUR
// ==========================================

export async function createHolidayAction(formData: FormData) {
  try {
    await assertWaka();
    const dateInput = formData.get("tanggal") as string;
    const keterangan = formData.get("keterangan") as string;

    if (!dateInput || !keterangan) {
      return { error: "Tanggal dan Keterangan wajib diisi." };
    }

    const tanggal = new Date(dateInput);

    await prisma.hariLibur.create({
      data: {
        tanggal,
        keterangan,
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Hari libur *${keterangan}* berhasil ditambahkan.` };
  } catch (error: any) {
    console.error("Create holiday error:", error);
    if (error.code === "P2002") {
      return { error: "Tanggal libur tersebut sudah terdaftar." };
    }
    return { error: error.message || "Gagal menambahkan hari libur." };
  }
}

export async function deleteHolidayAction(holidayId: string) {
  try {
    await assertWaka();

    const deleted = await prisma.hariLibur.delete({
      where: { id: holidayId },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Hari libur *${deleted.keterangan}* berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete holiday error:", error);
    return { error: error.message || "Gagal menghapus hari libur." };
  }
}

// ==========================================
// 7. PENUGASAN KELAS (WALI KELAS & GURU BK)
// ==========================================

export async function updateKelasAssignmentAction(
  kelasId: string,
  walasId: string | null,
  bkId: string | null,
  nama?: string
) {
  try {
    await assertWaka();

    if (nama !== undefined && !nama.trim()) {
      return { error: "Nama kelas tidak boleh kosong." };
    }

    // Jika walasId diubah, pastikan tidak melanggar constraint unique (satu walas hanya mengampu 1 kelas)
    if (walasId) {
      const existing = await prisma.kelas.findFirst({
        where: {
          walasId,
          NOT: { id: kelasId },
        },
      });
      if (existing) {
        return { error: "Guru tersebut sudah ditugaskan sebagai Wali Kelas di kelas lain." };
      }
    }

    await prisma.kelas.update({
      where: { id: kelasId },
      data: {
        nama: nama || undefined,
        walasId: walasId || null,
        bkId: bkId || null,
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/absensi");
    revalidatePath("/dashboard");
    return { success: true, message: "Data kelas berhasil diperbarui." };
  } catch (error: any) {
    console.error("Update kelas assignment error:", error);
    return { error: error.message || "Gagal memperbarui kelas." };
  }
}

// ==========================================
// 8. MANAJEMEN TAHUN PELAJARAN
// ==========================================

export async function createTahunAjaranAction(formData: FormData) {
  try {
    await assertWaka();
    const nama = formData.get("nama") as string;
    const setAktif = formData.get("setAktif") === "true";
    const semesterAktif = (formData.get("semesterAktif") as string) || "GANJIL";
    const ganjilMulaiStr = formData.get("ganjilMulai") as string;
    const ganjilSelesaiStr = formData.get("ganjilSelesai") as string;
    const genapMulaiStr = formData.get("genapMulai") as string;
    const genapSelesaiStr = formData.get("genapSelesai") as string;

    if (!nama) {
      return { error: "Nama Tahun Pelajaran wajib diisi." };
    }

    const ganjilMulai = ganjilMulaiStr ? new Date(ganjilMulaiStr) : null;
    const ganjilSelesai = ganjilSelesaiStr ? new Date(ganjilSelesaiStr) : null;
    const genapMulai = genapMulaiStr ? new Date(genapMulaiStr) : null;
    const genapSelesai = genapSelesaiStr ? new Date(genapSelesaiStr) : null;

    await prisma.$transaction(async (tx) => {
      if (setAktif) {
        // Nonaktifkan semua tahun ajaran lain
        await tx.tahunAjaran.updateMany({
          data: { isActive: false },
        });
      }

      await tx.tahunAjaran.create({
        data: {
          nama,
          isActive: setAktif,
          semesterAktif,
          ganjilMulai,
          ganjilSelesai,
          genapMulai,
          genapSelesai,
        },
      });
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Tahun Pelajaran *${nama}* berhasil dibuat.` };
  } catch (error: any) {
    console.error("Create tahun ajaran error:", error);
    if (error.code === "P2002") {
      return { error: "Nama Tahun Pelajaran tersebut sudah ada." };
    }
    return { error: error.message || "Gagal membuat tahun pelajaran." };
  }
}

export async function setActiveTahunAjaranAction(taId: string) {
  try {
    await assertWaka();

    await prisma.$transaction([
      prisma.tahunAjaran.updateMany({
        data: { isActive: false },
      }),
      prisma.tahunAjaran.update({
        where: { id: taId },
        data: { isActive: true },
      }),
    ]);

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: "Tahun Pelajaran aktif berhasil diubah." };
  } catch (error: any) {
    console.error("Set active tahun ajaran error:", error);
    return { error: error.message || "Gagal mengubah Tahun Pelajaran aktif." };
  }
}

export async function deleteTahunAjaranAction(taId: string) {
  try {
    await assertWaka();

    // Cek apakah ada kelas yang terkait
    const kelasCount = await prisma.kelas.count({
      where: { tahunAjaranId: taId },
    });

    if (kelasCount > 0) {
      return { error: "Tidak dapat menghapus Tahun Pelajaran ini karena masih memiliki data kelas aktif." };
    }

    const deleted = await prisma.tahunAjaran.delete({
      where: { id: taId },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Tahun Pelajaran *${deleted.nama}* berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete tahun ajaran error:", error);
    return { error: error.message || "Gagal menghapus Tahun Pelajaran." };
  }
}

// ==========================================
// NEW: UPDATE ACTIONS FOR GURU, SISWA, VIOLATIONS, REMISSIONS, HOLIDAYS, TAHUN AJARAN
// ==========================================

export async function updateUserAction(userId: string, formData: FormData) {
  try {
    await assertWaka();
    const nip = formData.get("nip") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const nama = formData.get("nama") as string;
    const role = formData.get("role") as Role;
    const whatsappNumber = formData.get("whatsappNumber") as string;

    if (!username || !nama || !role) {
      return { error: "Username, Nama, dan Role wajib diisi." };
    }

    const dataToUpdate: any = {
      nip: nip || null,
      username,
      nama,
      role,
      whatsappNumber: whatsappNumber || null,
    };

    if (password && password.trim() !== "") {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    revalidatePath("/kesiswaan");
    return { success: true, message: `Akun Guru/Staff *${nama}* berhasil diperbarui.` };
  } catch (error: any) {
    console.error("Update user error:", error);
    if (error.code === "P2002") {
      return { error: "Username sudah digunakan oleh akun lain." };
    }
    return { error: error.message || "Gagal memperbarui akun." };
  }
}

export async function updateSiswaAction(siswaId: string, formData: FormData) {
  try {
    await assertWaka();
    const nis = formData.get("nis") as string;
    const nama = formData.get("nama") as string;
    const kelasId = formData.get("kelasId") as string;

    if (!nis || !nama || !kelasId) {
      return { error: "NIS, Nama, dan Kelas wajib diisi." };
    }

    const activeTA = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });
    if (!activeTA) {
      return { error: "Tidak ada Tahun Ajaran aktif saat ini." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.siswa.update({
        where: { id: siswaId },
        data: {
          nis,
          nama,
        },
      });

      await tx.siswaKelas.upsert({
        where: {
          siswaId_tahunAjaranId: {
            siswaId,
            tahunAjaranId: activeTA.id,
          },
        },
        update: {
          kelasId,
        },
        create: {
          siswaId,
          kelasId,
          tahunAjaranId: activeTA.id,
        },
      });
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Data siswa *${nama}* berhasil diperbarui.` };
  } catch (error: any) {
    console.error("Update siswa error:", error);
    if (error.code === "P2002") {
      return { error: "NIS sudah digunakan oleh siswa lain." };
    }
    return { error: error.message || "Gagal memperbarui data siswa." };
  }
}

export async function updateViolationItemAction(detailId: string, formData: FormData) {
  try {
    await assertWaka();
    const isNewCategory = formData.get("isNewCategory") === "true";
    const categoryName = formData.get("categoryName") as string;
    const categoryId = formData.get("categoryId") as string;
    const detailName = formData.get("detailName") as string;
    const points = parseFloat(formData.get("points") as string);

    if (!detailName || isNaN(points)) {
      return { error: "Nama pelanggaran dan bobot poin wajib diisi secara valid." };
    }

    let finalCategoryId = categoryId;

    if (isNewCategory) {
      if (!categoryName) {
        return { error: "Nama kategori baru wajib diisi." };
      }
      const newCat = await prisma.kategoriPelanggaran.create({
        data: { nama: categoryName },
      });
      finalCategoryId = newCat.id;
    } else {
      if (!categoryId) {
        return { error: "Kategori wajib dipilih." };
      }
    }

    await prisma.detailPelanggaran.update({
      where: { id: detailId },
      data: {
        kategoriId: finalCategoryId,
        nama: detailName,
        poin: points,
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/pelanggaran");
    return { success: true, message: `Jenis pelanggaran *${detailName}* berhasil diperbarui.` };
  } catch (error: any) {
    console.error("Update violation item error:", error);
    return { error: error.message || "Gagal memperbarui jenis pelanggaran." };
  }
}

export async function updateRemissionItemAction(remissionId: string, formData: FormData) {
  try {
    await assertWaka();
    const nama = formData.get("nama") as string;
    const persentase = parseInt(formData.get("persentase") as string, 10);

    if (!nama || isNaN(persentase)) {
      return { error: "Nama remisi dan persentase wajib diisi." };
    }

    await prisma.masterRemisi.update({
      where: { id: remissionId },
      data: {
        nama,
        persentasePengurangan: persentase,
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/remisi");
    return { success: true, message: `Jenis remisi *${nama}* berhasil diperbarui.` };
  } catch (error: any) {
    console.error("Update remission item error:", error);
    return { error: error.message || "Gagal memperbarui jenis remisi." };
  }
}

export async function updateHolidayAction(holidayId: string, formData: FormData) {
  try {
    await assertWaka();
    const dateInput = formData.get("tanggal") as string;
    const keterangan = formData.get("keterangan") as string;

    if (!dateInput || !keterangan) {
      return { error: "Tanggal dan Keterangan wajib diisi." };
    }

    const tanggal = new Date(dateInput);

    await prisma.hariLibur.update({
      where: { id: holidayId },
      data: {
        tanggal,
        keterangan,
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Hari libur *${keterangan}* berhasil diperbarui.` };
  } catch (error: any) {
    console.error("Update holiday error:", error);
    return { error: error.message || "Gagal memperbarui hari libur." };
  }
}

export async function updateTahunAjaranAction(taId: string, formData: FormData) {
  try {
    await assertWaka();
    const nama = formData.get("nama") as string;
    const semesterAktif = (formData.get("semesterAktif") as string) || "GANJIL";
    const ganjilMulaiStr = formData.get("ganjilMulai") as string;
    const ganjilSelesaiStr = formData.get("ganjilSelesai") as string;
    const genapMulaiStr = formData.get("genapMulai") as string;
    const genapSelesaiStr = formData.get("genapSelesai") as string;

    if (!nama) {
      return { error: "Nama Tahun Pelajaran wajib diisi." };
    }

    const ganjilMulai = ganjilMulaiStr ? new Date(ganjilMulaiStr) : null;
    const ganjilSelesai = ganjilSelesaiStr ? new Date(ganjilSelesaiStr) : null;
    const genapMulai = genapMulaiStr ? new Date(genapMulaiStr) : null;
    const genapSelesai = genapSelesaiStr ? new Date(genapSelesaiStr) : null;

    await prisma.tahunAjaran.update({
      where: { id: taId },
      data: {
        nama,
        semesterAktif,
        ganjilMulai,
        ganjilSelesai,
        genapMulai,
        genapSelesai,
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: `Tahun Pelajaran berhasil diperbarui.` };
  } catch (error: any) {
    console.error("Update tahun ajaran error:", error);
    return { error: error.message || "Gagal memperbarui tahun pelajaran." };
  }
}

/**
 * Menyalin struktur kelas (nama kelas) dari tahun pelajaran sebelumnya ke tahun pelajaran aktif saat ini.
 */
export async function duplicateClassStructureAction() {
  try {
    await assertWaka();
    
    // 1. Cari Tahun Ajaran aktif saat ini
    const activeTA = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });
    if (!activeTA) {
      return { error: "Tidak ada Tahun Pelajaran aktif saat ini." };
    }

    // 2. Cari Tahun Ajaran sebelum tahun ajaran aktif berdasarkan pembuatan terdekat
    const allTA = await prisma.tahunAjaran.findMany({
      orderBy: { nama: "desc" },
    });
    const activeIndex = allTA.findIndex((ta) => ta.id === activeTA.id);
    const prevTA = allTA[activeIndex + 1]; 
    if (!prevTA) {
      return { error: "Tidak ada Tahun Pelajaran sebelumnya untuk disalin." };
    }

    // 3. Ambil daftar kelas dari Tahun Pelajaran sebelumnya
    const prevClasses = await prisma.kelas.findMany({
      where: { tahunAjaranId: prevTA.id },
    });

    if (prevClasses.length === 0) {
      return { error: `Tidak ditemukan kelas di Tahun Pelajaran sebelumnya (${prevTA.nama}).` };
    }

    // 4. Salin kelas ke tahun ajaran aktif secara transaksional
    let createdCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const cls of prevClasses) {
        // Hindari duplikasi nama kelas di tahun pelajaran aktif
        const existing = await tx.kelas.findFirst({
          where: { nama: cls.nama, tahunAjaranId: activeTA.id },
        });
        if (!existing) {
          await tx.kelas.create({
            data: {
              nama: cls.nama,
              tahunAjaranId: activeTA.id,
            },
          });
          createdCount++;
        }
      }
    });

    revalidatePath("/kesiswaan");
    return { 
      success: true, 
      message: `Berhasil menyalin ${createdCount} struktur kelas dari Tahun Pelajaran ${prevTA.nama} ke Tahun Pelajaran aktif saat ini (${activeTA.nama}).` 
    };
  } catch (error: any) {
    console.error("Duplicate class structure error:", error);
    return { error: error.message || "Gagal menyalin struktur kelas." };
  }
}

/**
 * Mengubah status seluruh siswa di kelas tertentu menjadi LULUS secara massal.
 */
export async function graduateClassStudentsAction(kelasId: string) {
  try {
    await assertWaka();
    
    // 1. Ambil semua siswa di kelas tersebut melalui siswaKelas roster
    const studentRosters = await prisma.siswaKelas.findMany({
      where: { kelasId },
    });
    const studentIds = studentRosters.map((s) => s.siswaId);

    if (studentIds.length === 0) {
      return { error: "Tidak ada siswa aktif di kelas ini untuk diluluskan." };
    }

    // 2. Update status siswa menjadi LULUS secara massal
    await prisma.siswa.updateMany({
      where: {
        id: { in: studentIds },
      },
      data: {
        status: "LULUS",
      },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { 
      success: true, 
      message: `Berhasil meluluskan ${studentIds.length} siswa pada kelas tersebut.` 
    };
  } catch (error: any) {
    console.error("Graduate class students error:", error);
    return { error: error.message || "Gagal meluluskan siswa." };
  }
}

/**
 * Menyimpan konfigurasi batas poin pemanggilan oleh Waka.
 */
export async function saveSettingsAction(formData: FormData) {
  try {
    await assertWaka();
    const threshold1 = formData.get("threshold_1") as string;
    const threshold2 = formData.get("threshold_2") as string;
    const threshold3 = formData.get("threshold_3") as string;
    const thresholdAlfa1 = formData.get("threshold_alfa_1") as string;
    const thresholdAlfa2 = formData.get("threshold_alfa_2") as string;
    const thresholdAlfa3 = formData.get("threshold_alfa_3") as string;
    const schoolName = formData.get("school_name") as string;
    const schoolLogoFile = formData.get("school_logo_file") as File | null;
    const schoolHeaderFile = formData.get("school_header_file") as File | null;
    const wakaName = formData.get("waka_name") as string;
    const wakaNip = formData.get("waka_nip") as string;

    const updates = [];

    if (threshold1 || threshold2 || threshold3) {
      if (!threshold1 || !threshold2 || !threshold3) {
        return { error: "Semua batas poin wajib diisi." };
      }
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "threshold_1" },
          update: { value: threshold1 },
          create: { key: "threshold_1", value: threshold1 },
        }),
        prisma.appSetting.upsert({
          where: { key: "threshold_2" },
          update: { value: threshold2 },
          create: { key: "threshold_2", value: threshold2 },
        }),
        prisma.appSetting.upsert({
          where: { key: "threshold_3" },
          update: { value: threshold3 },
          create: { key: "threshold_3", value: threshold3 },
        })
      );
    }

    if (thresholdAlfa1 || thresholdAlfa2 || thresholdAlfa3) {
      if (!thresholdAlfa1 || !thresholdAlfa2 || !thresholdAlfa3) {
        return { error: "Semua batas alfa wajib diisi." };
      }
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "threshold_alfa_1" },
          update: { value: thresholdAlfa1 },
          create: { key: "threshold_alfa_1", value: thresholdAlfa1 },
        }),
        prisma.appSetting.upsert({
          where: { key: "threshold_alfa_2" },
          update: { value: thresholdAlfa2 },
          create: { key: "threshold_alfa_2", value: thresholdAlfa2 },
        }),
        prisma.appSetting.upsert({
          where: { key: "threshold_alfa_3" },
          update: { value: thresholdAlfa3 },
          create: { key: "threshold_alfa_3", value: thresholdAlfa3 },
        })
      );
    }


    if (schoolName !== null) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "school_name" },
          update: { value: schoolName },
          create: { key: "school_name", value: schoolName },
        })
      );
    }

    const schoolCity = formData.get("school_city") as string;
    if (schoolCity !== null) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "school_city" },
          update: { value: schoolCity },
          create: { key: "school_city", value: schoolCity },
        })
      );
    }

    if (wakaName !== null) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "waka_name" },
          update: { value: wakaName },
          create: { key: "waka_name", value: wakaName },
        })
      );
    }

    if (wakaNip !== null) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "waka_nip" },
          update: { value: wakaNip },
          create: { key: "waka_nip", value: wakaNip },
        })
      );
    }

    const printPaperSize = formData.get("print_paper_size") as string;
    if (printPaperSize) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "print_paper_size" },
          update: { value: printPaperSize },
          create: { key: "print_paper_size", value: printPaperSize },
        })
      );
    }

    if (schoolLogoFile && schoolLogoFile.size > 0) {
      const buffer = Buffer.from(await schoolLogoFile.arrayBuffer());
      const ext = path.extname(schoolLogoFile.name) || ".png";
      const filename = `school_logo_${Date.now()}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, filename), buffer);
      const logoUrl = `/uploads/${filename}`;

      updates.push(
        prisma.appSetting.upsert({
          where: { key: "school_logo" },
          update: { value: logoUrl },
          create: { key: "school_logo", value: logoUrl },
        })
      );
    }

    if (schoolHeaderFile && schoolHeaderFile.size > 0) {
      const buffer = Buffer.from(await schoolHeaderFile.arrayBuffer());
      const ext = path.extname(schoolHeaderFile.name) || ".png";
      const filename = `school_header_${Date.now()}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, filename), buffer);
      const headerUrl = `/uploads/${filename}`;

      updates.push(
        prisma.appSetting.upsert({
          where: { key: "school_header" },
          update: { value: headerUrl },
          create: { key: "school_header", value: headerUrl },
        })
      );
    }

    await prisma.$transaction(updates);

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    revalidatePath("/login");
    revalidatePath("/", "layout");
    return { success: true, message: "Pengaturan berhasil disimpan." };
  } catch (error: any) {
    console.error("Save settings error:", error);
    return { error: error.message || "Gagal menyimpan pengaturan." };
  }
}

// Guard helper untuk BK atau WAKA
async function assertBkOrWaka() {
  const user = await getSessionUser();
  if (!user || (user.role !== "WAKA" && user.role !== "BK")) {
    throw new Error("Akses ditolak. Tindakan ini hanya boleh dilakukan oleh Guru BK atau Waka Kesiswaan.");
  }
  return user;
}

/**
 * Mengunggah surat perjanjian dan menyelesaikan status pemanggilan siswa.
 */
export async function resolveSummonsAction(formData: FormData) {
  try {
    await assertBkOrWaka();
    const siswaId = formData.get("siswaId") as string;
    const thresholdPoints = parseInt(formData.get("thresholdPoints") as string, 10);
    const file = formData.get("file") as File | null;

    if (!siswaId || isNaN(thresholdPoints)) {
      return { error: "Siswa ID dan batas poin tidak valid." };
    }

    let filePath = "";
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fullPath = path.join(uploadDir, filename);
      fs.writeFileSync(fullPath, buffer);
      filePath = `/uploads/${filename}`;
    } else {
      return { error: "File surat perjanjian wajib diunggah." };
    }

    await prisma.pemanggilanSiswa.upsert({
      where: {
        siswaId_thresholdPoints: {
          siswaId,
          thresholdPoints,
        },
      },
      update: {
        status: "SELESAI",
        suratPerjanjian: filePath,
        resolvedAt: new Date(),
      },
      create: {
        siswaId,
        thresholdPoints,
        status: "SELESAI",
        suratPerjanjian: filePath,
        resolvedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/kesiswaan");
    return { success: true, message: "Panggilan berhasil diselesaikan dan surat perjanjian disimpan." };
  } catch (error: any) {
    console.error("Resolve summons error:", error);
    return { error: error.message || "Gagal memproses pemanggilan." };
  }
}

export async function saveWeeklyHolidaysAction(formData: FormData) {
  try {
    await assertWaka();
    const liburSabtu = formData.get("libur_sabtu") === "on" ? "true" : "false";
    const liburMinggu = formData.get("libur_minggu") === "on" ? "true" : "false";

    await prisma.$transaction([
      prisma.appSetting.upsert({
        where: { key: "libur_sabtu" },
        update: { value: liburSabtu },
        create: { key: "libur_sabtu", value: liburSabtu },
      }),
      prisma.appSetting.upsert({
        where: { key: "libur_minggu" },
        update: { value: liburMinggu },
        create: { key: "libur_minggu", value: liburMinggu },
      }),
    ]);

    revalidatePath("/kesiswaan");
    revalidatePath("/dashboard");
    return { success: true, message: "Pengaturan hari libur rutin mingguan berhasil disimpan." };
  } catch (error: any) {
    console.error("Save weekly holidays error:", error);
    return { error: error.message || "Gagal menyimpan pengaturan." };
  }
}

export async function deleteUsersBulkAction(userIds: string[]) {
  try {
    await assertWaka();

    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });

    revalidatePath("/kesiswaan");
    return { success: true, message: `${userIds.length} akun guru/staff berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete users bulk error:", error);
    return { error: error.message || "Gagal menghapus beberapa akun guru/staff." };
  }
}

export async function deleteKelasBulkAction(kelasIds: string[]) {
  try {
    await assertWaka();

    const studentRosters = await prisma.siswaKelas.findMany({ where: { kelasId: { in: kelasIds } } });
    const studentIds = studentRosters.map((s) => s.siswaId);

    await prisma.absensi.deleteMany({ where: { siswaId: { in: studentIds } } });
    await prisma.laporanPelanggaran.deleteMany({ where: { siswaId: { in: studentIds } } });
    await prisma.transaksiRemisi.deleteMany({ where: { siswaId: { in: studentIds } } });
    await prisma.siswaKelas.deleteMany({ where: { kelasId: { in: kelasIds } } });
    await prisma.siswa.deleteMany({ where: { id: { in: studentIds } } });

    await prisma.kelas.deleteMany({
      where: { id: { in: kelasIds } },
    });

    revalidatePath("/kesiswaan");
    revalidatePath("/absensi");
    return { success: true, message: `${kelasIds.length} kelas beserta seluruh siswanya berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete kelas bulk error:", error);
    return { error: error.message || "Gagal menghapus beberapa kelas." };
  }
}

export async function deleteSiswaBulkAction(siswaIds: string[]) {
  try {
    await assertWaka();

    await prisma.absensi.deleteMany({ where: { siswaId: { in: siswaIds } } });
    await prisma.laporanPelanggaran.deleteMany({ where: { siswaId: { in: siswaIds } } });
    await prisma.transaksiRemisi.deleteMany({ where: { siswaId: { in: siswaIds } } });
    await prisma.siswaKelas.deleteMany({ where: { siswaId: { in: siswaIds } } });

    await prisma.siswa.deleteMany({
      where: { id: { in: siswaIds } },
    });

    revalidatePath("/kesiswaan");
    return { success: true, message: `${siswaIds.length} siswa berhasil dihapus dari sistem.` };
  } catch (error: any) {
    console.error("Delete siswa bulk error:", error);
    return { error: error.message || "Gagal menghapus beberapa data siswa." };
  }
}



