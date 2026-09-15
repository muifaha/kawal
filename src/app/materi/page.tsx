import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import MateriClient from "./MateriClient";

export default async function MateriPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    redirect("/login");
  }

  return <MateriClient user={user} />;
}
