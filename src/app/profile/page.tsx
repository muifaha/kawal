import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export const revalidate = 0;

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Ambil detail data user dari database agar update terbaru selalu tampil
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      nama: true,
      role: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  return (
    <SidebarLayout user={user}>
      <ProfileClient currentUser={dbUser} />
    </SidebarLayout>
  );
}
