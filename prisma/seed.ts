import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Clean Database (optional but good for seed resets)
  await prisma.absensi.deleteMany({});
  await prisma.laporanPelanggaran.deleteMany({});
  await prisma.transaksiRemisi.deleteMany({});
  await prisma.siswaKelas.deleteMany({});
  await prisma.siswa.deleteMany({});
  await prisma.kelas.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tahunAjaran.deleteMany({});
  await prisma.detailPelanggaran.deleteMany({});
  await prisma.kategoriPelanggaran.deleteMany({});
  await prisma.masterRemisi.deleteMany({});

  console.log("Database cleaned.");

  // 2. Hash Passwords
  const hashWaka = await bcrypt.hash("waka123", 10);
  const hashBK = await bcrypt.hash("admin123", 10);
  const hashWalas = await bcrypt.hash("walas123", 10);
  const hashGuru = await bcrypt.hash("guru123", 10);
  const hashOsis = await bcrypt.hash("osis123", 10);

  // 3. Create Users
  const userWaka = await prisma.user.create({
    data: {
      nip: "197508122000031001",
      username: "waka_admin",
      passwordHash: hashWaka,
      nama: "H. Mulyadi, M.Pd. (Waka Kesiswaan)",
      role: Role.WAKA,
    },
  });

  const userBK = await prisma.user.create({
    data: {
      nip: "198004052005012002",
      username: "bk_admin",
      passwordHash: hashBK,
      nama: "Budi Santoso, S.Pd. (Guru BK)",
      role: Role.BK,
    },
  });

  const userWalas = await prisma.user.create({
    data: {
      nip: "198811122015042003",
      username: "walas_rpl",
      passwordHash: hashWalas,
      nama: "Dewi Lestari, M.Kom. (Wali Kelas)",
      role: Role.WALAS,
      whatsappNumber: "+6281234567890", // Contoh nomor WA Wali Kelas
    },
  });

  const userGuru = await prisma.user.create({
    data: {
      nip: "199201202020081004",
      username: "guru_piket",
      passwordHash: hashGuru,
      nama: "Joko Susilo, S.Pd. (Guru Mapel)",
      role: Role.GURU,
    },
  });

  const userOsis = await prisma.user.create({
    data: {
      username: "osis_siswa",
      passwordHash: hashOsis,
      nama: "Rian Hidayat (Ketua OSIS)",
      role: Role.OSIS,
    },
  });

  console.log("Users created.");

  // 4. Create Tahun Ajaran
  const ta2025 = await prisma.tahunAjaran.create({
    data: {
      nama: "2025/2026",
      isActive: true,
    },
  });

  const ta2026 = await prisma.tahunAjaran.create({
    data: {
      nama: "2026/2027",
      isActive: false,
    },
  });

  console.log("Academic years created.");

  // 5. Create Kelas
  const kelasRPL = await prisma.kelas.create({
    data: {
      nama: "XI RPL 2",
      tahunAjaranId: ta2025.id,
      walasId: userWalas.id,
    },
  });

  console.log("Class XI RPL 2 created.");

  // 6. Create Siswa & SiswaKelas
  const siswa1 = await prisma.siswa.create({
    data: { nis: "10291", nama: "Ahmad Subagja" },
  });
  await prisma.siswaKelas.create({
    data: { siswaId: siswa1.id, kelasId: kelasRPL.id, tahunAjaranId: ta2025.id },
  });

  const siswa2 = await prisma.siswa.create({
    data: { nis: "10292", nama: "Budi Utomo" },
  });
  await prisma.siswaKelas.create({
    data: { siswaId: siswa2.id, kelasId: kelasRPL.id, tahunAjaranId: ta2025.id },
  });

  const siswa3 = await prisma.siswa.create({
    data: { nis: "10293", nama: "Citra Lestari" },
  });
  await prisma.siswaKelas.create({
    data: { siswaId: siswa3.id, kelasId: kelasRPL.id, tahunAjaranId: ta2025.id },
  });

  const siswa4 = await prisma.siswa.create({
    data: { nis: "10294", nama: "Dani Ramadhan" },
  });
  await prisma.siswaKelas.create({
    data: { siswaId: siswa4.id, kelasId: kelasRPL.id, tahunAjaranId: ta2025.id },
  });

  console.log("Students created.");

  // 7. Create Kategori & Detail Pelanggaran
  const katKerapian = await prisma.kategoriPelanggaran.create({
    data: { nama: "Kerapian" },
  });
  await prisma.detailPelanggaran.createMany({
    data: [
      { kategoriId: katKerapian.id, nama: "Tidak memakai dasi", poin: 5 },
      { kategoriId: katKerapian.id, nama: "Rambut panjang melebihi kerah", poin: 10 },
      { kategoriId: katKerapian.id, nama: "Sepatu bukan warna hitam", poin: 5 },
    ],
  });

  const katKedisiplinan = await prisma.kategoriPelanggaran.create({
    data: { nama: "Kedisiplinan" },
  });
  await prisma.detailPelanggaran.createMany({
    data: [
      { kategoriId: katKedisiplinan.id, nama: "Terlambat masuk kelas", poin: 5 },
      { kategoriId: katKedisiplinan.id, nama: "Membolos jam pelajaran", poin: 15 },
      { kategoriId: katKedisiplinan.id, nama: "Meninggalkan sekolah tanpa izin", poin: 20 },
      { kategoriId: katKedisiplinan.id, nama: "Terlambat mengikuti upacara bendera", poin: 10 },
      { kategoriId: katKedisiplinan.id, nama: "Tidak memakai atribut upacara lengkap", poin: 5 },
    ],
  });

  const katPerilaku = await prisma.kategoriPelanggaran.create({
    data: { nama: "Perilaku" },
  });
  await prisma.detailPelanggaran.createMany({
    data: [
      { kategoriId: katPerilaku.id, nama: "Merusak fasilitas sekolah", poin: 30 },
      { kategoriId: katPerilaku.id, nama: "Berkelahi di lingkungan sekolah", poin: 50 },
      { kategoriId: katPerilaku.id, nama: "Menggunakan HP di kelas tanpa izin", poin: 10 },
    ],
  });

  console.log("Violation categories & items created.");

  // 8. Create Master Remisi
  await prisma.masterRemisi.createMany({
    data: [
      { nama: "Bawa Pohon untuk Penghijauan", persentasePengurangan: 15 },
      { nama: "Kerja Bakti Lingkungan", persentasePengurangan: 10 },
      { nama: "Pemutihan Kenaikan Kelas", persentasePengurangan: 20 },
    ],
  });

  console.log("Master remissions created.");
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
