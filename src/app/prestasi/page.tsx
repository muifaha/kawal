import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import PrestasiClient from "./PrestasiClient";
import { getPrestasiListAction } from "@/app/actions/prestasi";

export const revalidate = 0;

export default async function PrestasiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["WAKA", "BK", "GURU", "PEMBINA_OSIS", "WALAS"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard?error=unauthorized");
  }

  // 1. Ambil Kelas dan Siswa Aktif
  const classWhereFilter: any = {
    tahunAjaran: { isActive: true },
  };

  if (user.role === "WALAS") {
    classWhereFilter.walasId = user.id;
  }

  const dbClasses = await prisma.kelas.findMany({
    where: classWhereFilter,
    include: {
      siswaKelas: {
        where: {
          siswa: { status: "AKTIF" },
        },
        include: {
          siswa: true,
        },
      },
    },
    orderBy: {
      nama: "asc",
    },
  });

  const classes = dbClasses.map((c) => ({
    id: c.id,
    nama: c.nama,
    siswa: c.siswaKelas.map((sk) => sk.siswa).sort((a, b) => a.nama.localeCompare(b.nama)),
  }));
  classes.sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: "base" }));

  // 2. Ambil riwayat/daftar prestasi siswa
  const resPrestasi = await getPrestasiListAction();
  let initialPrestasiList = resPrestasi.success && resPrestasi.data ? resPrestasi.data : [];

  if (user.role === "WALAS") {
    const walasClassNames = new Set(classes.map((c) => c.nama));
    const walasStudentIds = new Set(classes.flatMap((c) => c.siswa.map((s) => s.id)));
    initialPrestasiList = initialPrestasiList.filter((item: any) =>
      item.anggota.some((a: any) => walasStudentIds.has(a.id) || walasClassNames.has(a.kelasNama))
    );
  }

  return (
    <SidebarLayout user={user}>
      <PrestasiClient
        user={user}
        classes={classes}
        initialPrestasiList={initialPrestasiList as any}
        defaultTab={tab === "input" ? "input" : "list"}
      />
    </SidebarLayout>
  );
}
