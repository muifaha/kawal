import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Restoring Waka user account...");
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

  console.log("Waka user successfully restored:", waka.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
