import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

const SECRET = process.env.JWT_SECRET || "kawal-super-secret-key-12345!";
const COOKIE_NAME = "kawal_session";

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
  nama: string;
  sessionId?: string;
}

/**
 * Membuat token JWT untuk sesi pengguna.
 */
export function signToken(user: SessionUser): string {
  return jwt.sign(user, SECRET, { expiresIn: "1d" });
}

/**
 * Memverifikasi token JWT.
 */
export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, SECRET) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Mengambil informasi pengguna yang sedang login berdasarkan cookie sesi.
 * Memakai React cache agar per-request tidak mengulang-ulang query database.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = verifyToken(token);
  if (!session) return null;

  // Keamanan Tambahan: Pengecekan Maksimal 2 Perangkat Aktif untuk SEKRETARIS
  if (session.role === "SEKRETARIS" && session.sessionId) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { activeSessions: true },
      });

      if (dbUser?.activeSessions && !dbUser.activeSessions.includes(session.sessionId)) {
        // Sesi telah di-logout atau dihapus dari daftar perangkat aktif
        return null;
      }
    } catch {
      // Abaikan jika error DB sementara
    }
  }

  return session;
});

/**
 * Menyimpan sesi pengguna ke dalam cookie.
 */
export async function setSession(user: SessionUser) {
  const token = signToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.DISABLE_COOKIE_SECURE !== "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 hari
  });
}

/**
 * Menghapus cookie sesi (logout).
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
