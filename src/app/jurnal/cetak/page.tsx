import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import CetakJurnalView from "./CetakJurnalView";

export default async function CetakJurnalPage({
  searchParams,
}: {
  searchParams: Promise<{ guruId?: string; tanggal?: string; token?: string }>;
}) {
  const params = await searchParams;
  const { guruId, tanggal, token } = params;

  if (!guruId || !tanggal) {
    return notFound();
  }

  // Validate Authentication (Token or Session)
  const expectedToken = process.env.RENCANA_AKSI_TOKEN || process.env.API_TOKEN || "kawal-rencana-aksi-token-2026";
  const user = await getSessionUser();

  const isTokenValid = token && token.trim() === expectedToken;
  if (!isTokenValid && !user) {
    return notFound();
  }

  // Parse date range
  const startOfDay = new Date(`${tanggal}T00:00:00.000Z`);
  const endOfDay = new Date(`${tanggal}T23:59:59.999Z`);

  // Fetch teacher profile
  const teacher = await prisma.user.findUnique({
    where: { id: guruId },
    select: {
      id: true,
      nama: true,
      nip: true,
      ttd: true,
      role: true,
    },
  });

  if (!teacher) {
    return notFound();
  }

  // Fetch school settings
  const settingsList = await prisma.appSetting.findMany();
  const schoolSettings: Record<string, string> = {};
  for (const s of settingsList) {
    schoolSettings[s.key] = s.value;
  }

  // Fetch all journals for this teacher on this date
  const journals = await prisma.jurnalMengajar.findMany({
    where: {
      guruId,
      tanggal: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      kelas: true,
      mapel: true,
      guru: {
        select: {
          nama: true,
          nip: true,
          ttd: true,
        },
      },
      absensi: {
        include: {
          siswa: true,
        },
        orderBy: {
          siswa: { nama: "asc" },
        },
      },
    },
    orderBy: { jamMulai: "asc" },
  });

  const dateObj = new Date(`${tanggal}T12:00:00.000Z`);
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(dateObj);

  return (
    <CetakJurnalView
      teacher={teacher}
      journals={journals}
      tanggalStr={tanggal}
      dateLabel={dateLabel}
      schoolSettings={schoolSettings}
    />
  );
}
