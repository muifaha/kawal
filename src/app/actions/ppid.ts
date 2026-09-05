"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface PpidPermohonanPayload {
  namaLengkap: string;
  nik: string;
  kategoriPemohon: string;
  alamat: string;
  nomorHp: string;
  email: string;
  fileIdentitas?: string | null;
  rincianInformasi: string;
  tujuanPenggunaan: string;
  caraMemperoleh: string;
  caraPengiriman: string;
}

export interface PpidKeberatanPayload {
  nomorPermohonan: string;
  namaLengkap: string;
  nomorHp: string;
  email: string;
  alasanKeberatan: string[];
  penjelasanKeberatan: string;
  fileBuktiAwal?: string | null;
}

// 1. Submit Permohonan Informasi Publik (Online)
export async function submitPpidPermohonanAction(payload: PpidPermohonanPayload) {
  try {
    const {
      namaLengkap,
      nik,
      kategoriPemohon,
      alamat,
      nomorHp,
      email,
      fileIdentitas,
      rincianInformasi,
      tujuanPenggunaan,
      caraMemperoleh,
      caraPengiriman,
    } = payload;

    if (!namaLengkap || !namaLengkap.trim()) {
      return { error: "Nama lengkap wajib diisi." };
    }

    const cleanNik = (nik || "").trim().replace(/\D/g, "");
    if (!cleanNik || cleanNik.length !== 16) {
      return { error: "Nomor KTP / NIK wajib diisi 16 digit angka secara valid." };
    }

    if (!kategoriPemohon) {
      return { error: "Kategori pemohon wajib dipilih." };
    }

    if (!alamat || !alamat.trim()) {
      return { error: "Alamat lengkap wajib diisi." };
    }

    if (!nomorHp || !nomorHp.trim()) {
      return { error: "Nomor HP / WhatsApp wajib diisi." };
    }

    if (!email || !email.trim()) {
      return { error: "Alamat email wajib diisi." };
    }

    if (!fileIdentitas) {
      return { error: "Unggah identitas (KTP / KTM / SIM) wajib dilampirkan." };
    }

    if (!rincianInformasi || !rincianInformasi.trim()) {
      return { error: "Rincian informasi yang dibutuhkan wajib diisi." };
    }

    if (!tujuanPenggunaan || !tujuanPenggunaan.trim()) {
      return { error: "Tujuan penggunaan informasi wajib diisi." };
    }

    if (!caraMemperoleh) {
      return { error: "Cara memperoleh informasi wajib dipilih." };
    }

    if (!caraPengiriman) {
      return { error: "Cara pengiriman informasi wajib dipilih." };
    }

    // Generate Auto Registration Number e.g. PPID-6TNG/2026/0001
    const year = new Date().getFullYear();
    const count = await prisma.ppidPermohonan.count();
    const sequence = String(count + 1).padStart(4, "0");
    const nomorRegistrasi = `PPID-6TNG/${year}/${sequence}`;

    const created = await prisma.ppidPermohonan.create({
      data: {
        nomorRegistrasi,
        namaLengkap: namaLengkap.trim(),
        nik: cleanNik,
        kategoriPemohon,
        alamat: alamat.trim(),
        nomorHp: nomorHp.trim(),
        email: email.trim(),
        fileIdentitas: fileIdentitas || null,
        rincianInformasi: rincianInformasi.trim(),
        tujuanPenggunaan: tujuanPenggunaan.trim(),
        caraMemperoleh,
        caraPengiriman,
        status: "PENDING",
      },
    });

    return {
      success: true,
      nomorRegistrasi: created.nomorRegistrasi,
      message: "Permohonan informasi publik berhasil dikirim.",
    };
  } catch (error: any) {
    console.error("Submit PPID Permohonan error:", error);
    return { error: `Gagal mengirimkan permohonan: ${error.message || error}` };
  }
}

// 2. Submit Pengajuan Keberatan Informasi Publik (Online)
export async function submitPpidKeberatanAction(payload: PpidKeberatanPayload) {
  try {
    const {
      nomorPermohonan,
      namaLengkap,
      nomorHp,
      email,
      alasanKeberatan,
      penjelasanKeberatan,
      fileBuktiAwal,
    } = payload;

    if (!nomorPermohonan || !nomorPermohonan.trim()) {
      return { error: "Nomor pendaftaran permohonan sebelumnya wajib diisi." };
    }

    if (!namaLengkap || !namaLengkap.trim()) {
      return { error: "Nama lengkap wajib diisi." };
    }

    if (!nomorHp || !nomorHp.trim()) {
      return { error: "Nomor HP / WhatsApp wajib diisi." };
    }

    if (!email || !email.trim()) {
      return { error: "Alamat email wajib diisi." };
    }

    if (!alasanKeberatan || !Array.isArray(alasanKeberatan) || alasanKeberatan.length === 0) {
      return { error: "Pilih minimal 1 alasan pengajuan keberatan." };
    }

    if (!penjelasanKeberatan || !penjelasanKeberatan.trim()) {
      return { error: "Penjelasan rinci alasan keberatan wajib diisi." };
    }

    // Generate Auto Registration Number e.g. KEBERATAN-6TNG/2026/0001
    const year = new Date().getFullYear();
    const count = await prisma.ppidKeberatan.count();
    const sequence = String(count + 1).padStart(4, "0");
    const nomorRegistrasi = `KEBERATAN-6TNG/${year}/${sequence}`;

    const created = await prisma.ppidKeberatan.create({
      data: {
        nomorRegistrasi,
        nomorPermohonan: nomorPermohonan.trim(),
        namaLengkap: namaLengkap.trim(),
        nomorHp: nomorHp.trim(),
        email: email.trim(),
        alasanKeberatan,
        penjelasanKeberatan: penjelasanKeberatan.trim(),
        fileBuktiAwal: fileBuktiAwal || null,
        status: "PENDING",
      },
    });

    return {
      success: true,
      nomorRegistrasi: created.nomorRegistrasi,
      message: "Pengajuan keberatan informasi publik berhasil dikirim.",
    };
  } catch (error: any) {
    console.error("Submit PPID Keberatan error:", error);
    return { error: `Gagal mengirimkan pengajuan keberatan: ${error.message || error}` };
  }
}

// 3. Fetch All PPID Data (For Waka Admin View)
export async function getPpidDataAction() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { error: "Sesi telah berakhir. Silakan login kembali." };
    }

    const permohonanList = await prisma.ppidPermohonan.findMany({
      orderBy: { createdAt: "desc" },
    });

    const keberatanList = await prisma.ppidKeberatan.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      permohonanList,
      keberatanList,
    };
  } catch (error: any) {
    console.error("Get PPID Data error:", error);
    return { error: "Gagal memuat data PPID." };
  }
}

// 4. Update Status & Response (Waka Admin)
export async function updatePpidStatusAction({
  id,
  type,
  status,
  tanggapan,
}: {
  id: string;
  type: "permohonan" | "keberatan";
  status: string;
  tanggapan?: string;
}) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "WAKA" && user.role !== "BK")) {
      return { error: "Akses ditolak. Hanya WAKA Kesiswaan yang berwenang memproses permohonan PPID." };
    }

    if (type === "permohonan") {
      await prisma.ppidPermohonan.update({
        where: { id },
        data: {
          status,
          tanggapan: tanggapan ? tanggapan.trim() : null,
        },
      });
    } else {
      await prisma.ppidKeberatan.update({
        where: { id },
        data: {
          status,
          tanggapan: tanggapan ? tanggapan.trim() : null,
        },
      });
    }

    revalidatePath("/rekap-ppid");
    return { success: true, message: "Status layanan PPID berhasil diperbarui." };
  } catch (error: any) {
    console.error("Update PPID status error:", error);
    return { error: `Gagal memperbarui status: ${error.message || error}` };
  }
}

// 5. Delete PPID Record (Waka Admin)
export async function deletePpidRecordAction({
  id,
  type,
}: {
  id: string;
  type: "permohonan" | "keberatan";
}) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "WAKA") {
      return { error: "Akses ditolak. Hanya WAKA Kesiswaan yang dapat menghapus berkas PPID." };
    }

    if (type === "permohonan") {
      await prisma.ppidPermohonan.delete({ where: { id } });
    } else {
      await prisma.ppidKeberatan.delete({ where: { id } });
    }

    revalidatePath("/rekap-ppid");
    return { success: true, message: "Data pengajuan PPID berhasil dihapus." };
  } catch (error: any) {
    console.error("Delete PPID record error:", error);
    return { error: "Gagal menghapus data PPID." };
  }
}
