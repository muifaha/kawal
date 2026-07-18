import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const hashWaka = await bcrypt.hash("waka123", 10);
    
    const waka = await prisma.user.upsert({
      where: { username: "waka_admin" },
      update: {
        nip: "197508122000031001",
        passwordHash: hashWaka,
        nama: "H. Mulyadi, M.Pd. (Waka Kesiswaan)",
        role: Role.WAKA,
      },
      create: {
        nip: "197508122000031001",
        username: "waka_admin",
        passwordHash: hashWaka,
        nama: "H. Mulyadi, M.Pd. (Waka Kesiswaan)",
        role: Role.WAKA,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Akun Waka (${waka.username}) berhasil dipulihkan/di-seed. Silakan login kembali dengan password default.`,
    });
  } catch (error: any) {
    console.error("Restore Waka API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memulihkan akun Waka." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
