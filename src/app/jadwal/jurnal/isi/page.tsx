import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import IsiJurnalClient from "./IsiJurnalClient";

interface PageProps {
  searchParams: Promise<{
    jadwalId?: string;
    jurnalId?: string;
    tanggal?: string;
  }>;
}

export const revalidate = 0;

export default async function IsiJurnalPage({ searchParams }: PageProps) {
  const { jadwalId, jurnalId, tanggal } = await searchParams;

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "GURU" && user.role !== "WALAS") {
    redirect("/jadwal");
  }

  let existingJurnal: any = null;
  if (jurnalId) {
    existingJurnal = await prisma.jurnalMengajar.findUnique({
      where: { id: jurnalId },
      include: {
        kelas: true,
        guru: true,
        mapel: true,
        absensi: true,
      },
    });
  }

  let targetDate = new Date();
  if (tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    targetDate = new Date(`${tanggal}T00:00:00.000Z`);
  } else {
    targetDate.setUTCHours(0, 0, 0, 0);
  }

  const targetJadwalId = jadwalId || existingJurnal?.jadwalId;
  let jadwal: any = null;

  if (targetJadwalId) {
    jadwal = await prisma.jadwalPelajaran.findUnique({
      where: { id: targetJadwalId },
      include: {
        kelas: true,
        guru: true,
        mapel: true,
      },
    });
  }

  if (!existingJurnal && targetJadwalId) {
    existingJurnal = await prisma.jurnalMengajar.findFirst({
      where: {
        jadwalId: targetJadwalId,
        tanggal: targetDate,
        guruId: user.id,
      },
      include: {
        kelas: true,
        guru: true,
        mapel: true,
        absensi: true,
      },
    });
  }

  const targetKelasId = jadwal?.kelasId || existingJurnal?.kelasId;
  const targetMapelId = jadwal?.mapelId || existingJurnal?.mapelId;

  if (!targetKelasId || !targetMapelId) {
    redirect("/jadwal");
  }

  // 2. Ambil seluruh siswa aktif di kelas tersebut
  const dbStudents = await prisma.siswaKelas.findMany({
    where: {
      kelasId: targetKelasId,
      siswa: { status: "AKTIF" },
    },
    include: {
      siswa: true,
    },
    orderBy: {
      siswa: { nama: "asc" },
    },
  });

  const studentsList = dbStudents.map((sk) => sk.siswa);

  // 3. Ambil data absensi hari ini (jika ada di BK) untuk pre-fill
  const todayAttendance = await prisma.absensi.findMany({
    where: {
      tanggal: targetDate,
      siswaId: { in: studentsList.map((s) => s.id) },
    },
    select: {
      siswaId: true,
      status: true,
    },
  });

  const attendanceMap: Record<string, string> = {};
  todayAttendance.forEach((att) => {
    attendanceMap[att.siswaId] = att.status;
  });

  const students = studentsList.map((s) => ({
    id: s.id,
    nis: s.nis,
    nama: s.nama,
    defaultStatus: attendanceMap[s.id] || "H",
  }));

  const existingJurnalData = existingJurnal ? {
    id: existingJurnal.id,
    namaJurnal: existingJurnal.namaJurnal,
    kegiatan: existingJurnal.kegiatan,
    foto: existingJurnal.foto,
    fotoKeterangan: existingJurnal.fotoKeterangan,
    absensi: existingJurnal.absensi.map((a: any) => ({ siswaId: a.siswaId, status: a.status })),
  } : null;

  const jadwalData = {
    id: targetJadwalId || "",
    kelasId: targetKelasId,
    kelasNama: jadwal?.kelas?.nama || existingJurnal?.kelas?.nama || "",
    mapelId: targetMapelId,
    mapelNama: jadwal?.mapel?.nama || existingJurnal?.mapel?.nama || "",
    jamMulai: jadwal?.jamMulai || existingJurnal?.jamMulai || 1,
    jamSelesai: jadwal?.jamSelesai || existingJurnal?.jamSelesai || 2,
  };

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
          {existingJurnalData ? "Edit Jurnal Mengajar" : "Formulir Jurnal Mengajar"}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {existingJurnalData
            ? "Perbarui uraian materi kelas, absensi siswa, atau dokumentasi foto yang telah diisi sebelumnya."
            : "Laporkan uraian materi kelas, absensi siswa terisolasi, unggah dokumentasi pembelajaran, serta penilaian kelas."}
        </p>
      </div>

      <IsiJurnalClient
        user={user}
        jadwal={jadwalData}
        students={students}
        existingJurnal={existingJurnalData}
      />
    </SidebarLayout>
  );
}
