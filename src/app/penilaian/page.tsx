import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import PenilaianClient from "./PenilaianClient";

export default async function PenilaianPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    redirect("/login");
  }

  return <PenilaianClient user={user} />;
}
