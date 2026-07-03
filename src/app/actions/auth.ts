"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSession, clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(prevState: any, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username dan Password wajib diisi." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return { error: "Username atau Password salah." };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return { error: "Username atau Password salah." };
    }

    await setSession({
      id: user.id,
      username: user.username,
      role: user.role,
      nama: user.nama,
    });
  } catch (error) {
    console.error("Login action error:", error);
    return { error: "Terjadi kesalahan sistem. Silakan coba lagi." };
  }

  // Redirect ke dashboard setelah login sukses
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
