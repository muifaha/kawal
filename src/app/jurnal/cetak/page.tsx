import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import CetakJurnalView from "./CetakJurnalView";

export default async function CetakJurnalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const resolvedParams = await searchParams;

  // Clean up params in case &amp; was passed in URL (HTML entity decoding fallback)
  const params: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(resolvedParams)) {
    const cleanKey = k.replace(/^amp;/, "");
    params[cleanKey] = v;
  }

  const guruId = params.guruId;
  const tanggal = params.tanggal;
  const token = params.token;

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

  // Date range with timezone safety buffer (+/- 36 hours around target date)
  const targetDateObj = new Date(`${tanggal}T12:00:00.000Z`);
  const startOfDay = new Date(targetDateObj.getTime() - 36 * 3600 * 1000);
  const endOfDay = new Date(targetDateObj.getTime() + 36 * 3600 * 1000);

  // Fetch school settings
  const settingsList = await prisma.appSetting.findMany();
  const schoolSettings: Record<string, string> = {};
  for (const s of settingsList) {
    schoolSettings[s.key] = s.value;
  }

  // Fetch all journals for this teacher around this date
  const candidateJournals = await prisma.jurnalMengajar.findMany({
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

  // Filter exact matching date in WIB (Asia/Jakarta)
  const journals = candidateJournals.filter((j) => {
    const jDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(j.tanggal));
    return jDateStr === tanggal;
  });

  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(targetDateObj);

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
