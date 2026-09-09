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

  if (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA") {
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

  const todayWibStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  let dateStr = tanggal;
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    if (existingJurnal?.tanggal) {
      dateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(existingJurnal.tanggal));
    } else if (jadwal && jadwal.hari) {
      // Infers the most recent date matching schedule day (1 = Senin, ..., 7 = Minggu)
      const todayObj = new Date(`${todayWibStr}T12:00:00.000Z`);
      const currentDay = todayObj.getUTCDay() === 0 ? 7 : todayObj.getUTCDay();
      let diff = currentDay - jadwal.hari;
      if (diff < 0) diff += 7;
      todayObj.setUTCDate(todayObj.getUTCDate() - diff);
      dateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(todayObj);
    } else {
      dateStr = todayWibStr;
    }
  }

  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

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

  const targetDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(targetDate);

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
        targetDateStr={targetDateStr}
      />
    </SidebarLayout>
  );
}
