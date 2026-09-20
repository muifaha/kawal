import React from "react";
import { getAdministrasiGuruDataAction } from "@/app/actions/administrasi";
import CetakAdministrasiView from "./CetakAdministrasiView";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function CetakAdministrasiPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const kelasId = params.kelasId;
  const mapelId = params.mapelId;
  const semester = (params.semester as "GANJIL" | "GENAP") || "GANJIL";
  const paper = (params.paper as "A4" | "F4") || "A4";

  if (!kelasId || !mapelId) {
    redirect("/administrasi");
  }

  const result = await getAdministrasiGuruDataAction({
    kelasId,
    mapelId,
    semester,
  });

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center text-rose-500 font-bold">
        {result.error || "Gagal memuat data Administrasi Guru."}
      </div>
    );
  }

  return (
    <CetakAdministrasiView
      data={result.data}
      initialPaperSize={paper}
    />
  );
}
