"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSession, clearSession, getSessionUser } from "@/lib/auth";
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

export async function updateProfileAction(nama: string, username: string, password?: string) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return { error: "Sesi Anda telah berakhir. Silakan login kembali." };
    }

    const cleanNama = nama.trim();
    const cleanUsername = username.trim();

    if (!cleanNama || !cleanUsername) {
      return { error: "Nama dan Username wajib diisi." };
    }

    // Cek jika username diubah dan apakah sudah ada yang memakai
    if (cleanUsername !== sessionUser.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });
      if (existingUser) {
        return { error: "Username sudah terdaftar di sistem." };
      }
    }

    // Siapkan data update
    const updateData: any = {
      nama: cleanNama,
      username: cleanUsername,
    };

    if (password && password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    // Update user di database
    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
    });

    // Update sesi cookie agar perubahan nama/username langsung terlihat di header
    await setSession({
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      nama: updatedUser.nama,
    });

    return { success: true, message: "Profil berhasil diperbarui." };
  } catch (error: any) {
    console.error("Update profile error:", error);
    return { error: error.message || "Gagal memperbarui profil." };
  }
}
