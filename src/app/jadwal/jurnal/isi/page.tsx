import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import IsiJurnalClient from "./IsiJurnalClient";

interface PageProps {
  searchParams: Promise<{
    jadwalId?: string;
  }>;
}

export const revalidate = 0;

export default async function IsiJurnalPage({ searchParams }: PageProps) {
  const { jadwalId } = await searchParams;

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "GURU" && user.role !== "WALAS") {
    redirect("/jadwal");
  }

  if (!jadwalId) {
    redirect("/jadwal");
  }

  // 1. Ambil data Jadwal Pelajaran
  const jadwal = await prisma.jadwalPelajaran.findUnique({
    where: { id: jadwalId },
    include: {
      kelas: true,
      guru: true,
      mapel: true,
    },
  });

  if (!jadwal || (jadwal.guruId !== user.id)) {
    redirect("/jadwal?error=unauthorized_schedule");
  }

  // 2. Ambil seluruh siswa aktif di kelas tersebut
  const dbStudents = await prisma.siswaKelas.findMany({
    where: {
      kelasId: jadwal.kelasId,
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
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Midnight UTC matching database date keys

  const todayAttendance = await prisma.absensi.findMany({
    where: {
      tanggal: today,
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
    defaultStatus: attendanceMap[s.id] || "H", // Default to "H" (Hadir) if not set in BK today
  }));

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
          Formulir Jurnal Mengajar
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Laporkan uraian materi kelas, absensi siswa terisolasi, unggah dokumentasi pembelajaran, serta penilaian kelas.
        </p>
      </div>

      <IsiJurnalClient
        user={user}
        jadwal={{
          id: jadwal.id,
          kelasId: jadwal.kelasId,
          kelasNama: jadwal.kelas.nama,
          mapelId: jadwal.mapelId,
          mapelNama: jadwal.mapel.nama,
          jamMulai: jadwal.jamMulai,
          jamSelesai: jadwal.jamSelesai,
        }}
        students={students}
      />
    </SidebarLayout>
  );
}
