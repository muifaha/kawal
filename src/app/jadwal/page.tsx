import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import JadwalClient from "./JadwalClient";

export const revalidate = 0;

export default async function JadwalPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Hanya WAKA, WALAS, dan GURU yang memiliki akses ke halaman ini
  if (user.role !== "WAKA" && user.role !== "WALAS" && user.role !== "GURU") {
    redirect("/dashboard");
  }

  // 1. Ambil data master untuk form scheduling (hanya WAKA yang mengelola, tapi Guru juga perlu melihat)
  const dbClasses = await prisma.kelas.findMany({
    where: {
      tahunAjaran: { isActive: true },
    },
    orderBy: { nama: "asc" },
  });

  const dbTeachers = await prisma.user.findMany({
    where: {
      role: { in: ["GURU", "WALAS"] },
    },
    orderBy: { nama: "asc" },
  });

  const dbSubjects = await prisma.mataPelajaran.findMany({
    orderBy: { nama: "asc" },
  });

  const dbPeriods = await prisma.jamPelajaran.findMany({
    orderBy: [
      { hariTipe: "asc" },
      { jamKe: "asc" },
    ],
  });

  // 2. Ambil data jadwal & jurnal sesuai hak akses
  let schedules: any[] = [];
  let journals: any[] = [];
  let todaySchedules: any[] = [];

  const todayDay = new Date().getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu

  if (user.role === "WAKA") {
    // WAKA melihat semua jadwal & semua jurnal
    schedules = await prisma.jadwalPelajaran.findMany({
      include: {
        kelas: true,
        guru: true,
        mapel: true,
      },
      orderBy: [
        { hari: "asc" },
        { jamMulai: "asc" },
      ],
    });

    journals = await prisma.jurnalMengajar.findMany({
      include: {
        kelas: true,
        guru: true,
        mapel: true,
        _count: {
          select: {
            absensi: true,
            penilaian: true,
          },
        },
      },
      orderBy: { tanggal: "desc" },
    });
  } else {
    // Guru / Walas melihat jadwal mereka sendiri & jurnal mereka sendiri
    schedules = await prisma.jadwalPelajaran.findMany({
      where: {
        guruId: user.id,
      },
      include: {
        kelas: true,
        guru: true,
        mapel: true,
      },
      orderBy: [
        { hari: "asc" },
        { jamMulai: "asc" },
      ],
    });

    // Jadwal mengajar untuk hari ini
    todaySchedules = await prisma.jadwalPelajaran.findMany({
      where: {
        guruId: user.id,
        hari: todayDay,
      },
      include: {
        kelas: true,
        guru: true,
        mapel: true,
      },
      orderBy: { jamMulai: "asc" },
    });

    journals = await prisma.jurnalMengajar.findMany({
      where: {
        guruId: user.id,
      },
      include: {
        kelas: true,
        guru: true,
        mapel: true,
        _count: {
          select: {
            absensi: true,
            penilaian: true,
          },
        },
      },
      orderBy: { tanggal: "desc" },
    });
  }

  // Format data untuk client component
  const classes = dbClasses.map((c) => ({ id: c.id, nama: c.nama }));
  classes.sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' }));
  const teachers = dbTeachers.map((t) => ({ id: t.id, nama: t.nama }));
  const subjects = dbSubjects.map((s) => ({ id: s.id, kode: s.kode, nama: s.nama }));
  const periods = dbPeriods.map((p) => ({
    id: p.id,
    hariTipe: p.hariTipe,
    jamKe: p.jamKe,
    waktuMulai: p.waktuMulai,
    waktuSelesai: p.waktuSelesai,
    isIstirahat: p.isIstirahat,
    keterangan: p.keterangan,
  }));

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
          Jadwal Pelajaran & Jurnal Mengajar
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {user.role === "WAKA"
            ? "Kelola timeline jam, master pelajaran, jadwal kelas, serta pantau jurnal kegiatan belajar mengajar."
            : "Lihat agenda mengajar hari ini serta kelola catatan jurnal kelas Anda."}
        </p>
      </div>

      <JadwalClient
        user={user}
        classes={classes}
        teachers={teachers}
        subjects={subjects}
        periods={periods}
        initialSchedules={schedules}
        initialJournals={journals}
        todaySchedules={todaySchedules}
      />
    </SidebarLayout>
  );
}
