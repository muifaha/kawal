"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs";

export async function savePenangananAction(formData: FormData) {
  const user = await getSessionUser();
  
  // Hanya Guru BK yang diizinkan menginput penanganan
  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Hanya Guru BK yang dapat menginput penanganan siswa." };
  }

  const siswaId = formData.get("siswaId") as string;
  const kasus = formData.get("kasus") as string;
  const solusi = formData.get("solusi") as string;

  if (!siswaId || !kasus || !solusi) {
    return { error: "Semua field (Siswa, Kasus/Masalah, Solusi) wajib diisi." };
  }

  try {
    // 1. Verifikasi bahwa BK ini ditugaskan ke kelas siswa tersebut
    const siswaWithClass = await prisma.siswa.findUnique({
      where: { id: siswaId },
      include: {
        riwayatKelas: {
          where: { tahunAjaran: { isActive: true } },
          include: { kelas: true },
        },
      },
    });

    if (!siswaWithClass || siswaWithClass.riwayatKelas.length === 0) {
      return { error: "Siswa tidak ditemukan atau belum terdaftar di kelas tahun ajaran aktif." };
    }

    const classId = siswaWithClass.riwayatKelas[0].kelasId;
    const targetClass = await prisma.kelas.findUnique({
      where: { id: classId },
    });

    if (!targetClass || targetClass.bkId !== user.id) {
      return { error: "Akses ditolak. Anda tidak ditugaskan sebagai Guru BK untuk siswa ini." };
    }

    // 2. Proses upload file bukti
    let uploadedBukti: string[] = [];
    const files = formData.getAll("files") as File[];
    for (const file of files) {
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
        uploadedBukti.push(`/uploads/${filename}`);
      }
    }

    const summonsId = formData.get("summonsId") as string | null;
    const thresholdPointsStr = formData.get("thresholdPoints") as string | null;
    const thresholdPoints = thresholdPointsStr ? parseInt(thresholdPointsStr, 10) : null;

    // 3. Buat record penanganan dan update status pemanggilan secara transaksional
    const dbOperations: any[] = [
      prisma.penangananSiswa.create({
        data: {
          siswaId,
          kasus,
          solusi,
          bukti: uploadedBukti,
          petugasId: user.id,
        },
      })
    ];

    if (thresholdPoints !== null) {
      dbOperations.push(
        prisma.pemanggilanSiswa.upsert({
          where: {
            siswaId_thresholdPoints: {
              siswaId,
              thresholdPoints,
            },
          },
          update: {
            status: "SELESAI",
            resolvedAt: new Date(),
            suratPerjanjian: uploadedBukti.length > 0 ? uploadedBukti[0] : null,
          },
          create: {
            siswaId,
            thresholdPoints,
            status: "SELESAI",
            resolvedAt: new Date(),
            suratPerjanjian: uploadedBukti.length > 0 ? uploadedBukti[0] : null,
          },
        })
      );
    } else if (summonsId && !summonsId.startsWith("virtual-")) {
      dbOperations.push(
        prisma.pemanggilanSiswa.update({
          where: { id: summonsId },
          data: {
            status: "SELESAI",
            resolvedAt: new Date(),
            suratPerjanjian: uploadedBukti.length > 0 ? uploadedBukti[0] : null,
          },
        })
      );
    }

    await prisma.$transaction(dbOperations);

    revalidatePath("/penanganan");
    revalidatePath("/dashboard");
    return { success: true, message: "Penanganan siswa berhasil disimpan ke log." };
  } catch (error: any) {
    console.error("Save penanganan error:", error);
    return { error: error.message || "Gagal menyimpan data penanganan." };
  }
}
