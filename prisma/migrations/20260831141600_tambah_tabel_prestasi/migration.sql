-- CreateEnum
CREATE TYPE "Role" AS ENUM ('WAKA', 'BK', 'WALAS', 'GURU', 'OSIS', 'SEKRETARIS', 'PIKET', 'PEMBINA_OSIS');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('H', 'S', 'I', 'A', 'D');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JenisKepesertaan" AS ENUM ('INDIVIDU', 'TIM');

-- CreateEnum
CREATE TYPE "KategoriPrestasi" AS ENUM ('BERJENJANG', 'TIDAK_BERJENJANG');

-- CreateEnum
CREATE TYPE "TingkatPrestasi" AS ENUM ('KECAMATAN', 'KOTA', 'PROVINSI', 'NASIONAL', 'INTERNASIONAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nip" TEXT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "whatsappNumber" TEXT,
    "activeSessions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TahunAjaran" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "semesterAktif" TEXT NOT NULL DEFAULT 'GANJIL',
    "ganjilMulai" DATE,
    "ganjilSelesai" DATE,
    "genapMulai" DATE,
    "genapSelesai" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TahunAjaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kelas" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "walasId" TEXT,
    "bkId" TEXT,
    "sekretarisId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Siswa" (
    "id" TEXT NOT NULL,
    "nis" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiswaKelas" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiswaKelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KategoriPelanggaran" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "KategoriPelanggaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetailPelanggaran" (
    "id" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "poin" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetailPelanggaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaporanPelanggaran" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "detailPelanggaranId" TEXT NOT NULL,
    "pelaporId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ViolationStatus" NOT NULL DEFAULT 'PENDING',
    "approverId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "bukti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isCensored" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LaporanPelanggaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterRemisi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "persentasePengurangan" INTEGER NOT NULL,

    CONSTRAINT "MasterRemisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaksiRemisi" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "masterRemisiId" TEXT,
    "poinDikurangi" DOUBLE PRECISION NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approverId" TEXT,
    "bukti" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "TransaksiRemisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absensi" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'H',
    "pencatatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HariLibur" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "keterangan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HariLibur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PemanggilanSiswa" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "thresholdPoints" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "suratPerjanjian" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PemanggilanSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenangananSiswa" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "kasus" TEXT NOT NULL,
    "solusi" TEXT NOT NULL,
    "bukti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "petugasId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PenangananSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RujukanSiswa" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "pembuatId" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tindakLanjut" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RujukanSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BimbinganKonseling" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "pembimbingId" TEXT NOT NULL,
    "bidang" TEXT NOT NULL,
    "masalah" TEXT NOT NULL,
    "solusi" TEXT NOT NULL,
    "catatanRahasia" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BimbinganKonseling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MataPelajaran" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MataPelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamPelajaran" (
    "id" TEXT NOT NULL,
    "hariTipe" TEXT NOT NULL,
    "jamKe" INTEGER NOT NULL,
    "waktuMulai" TEXT NOT NULL,
    "waktuSelesai" TEXT NOT NULL,
    "isIstirahat" BOOLEAN NOT NULL DEFAULT false,
    "keterangan" TEXT,

    CONSTRAINT "JamPelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JadwalPelajaran" (
    "id" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "hari" INTEGER NOT NULL,
    "jamMulai" INTEGER NOT NULL,
    "jamSelesai" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JadwalPelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurnalMengajar" (
    "id" TEXT NOT NULL,
    "jadwalId" TEXT,
    "kelasId" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "jamMulai" INTEGER NOT NULL,
    "jamSelesai" INTEGER NOT NULL,
    "tanggal" DATE NOT NULL,
    "namaJurnal" TEXT NOT NULL,
    "kegiatan" TEXT NOT NULL,
    "foto" TEXT,
    "fotoKeterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurnalMengajar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurnalAbsensi" (
    "id" TEXT NOT NULL,
    "jurnalId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "JurnalAbsensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurnalPenilaian" (
    "id" TEXT NOT NULL,
    "jurnalId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "nilai" INTEGER NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "JurnalPenilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrestasiSiswa" (
    "id" TEXT NOT NULL,
    "jenisKepesertaan" "JenisKepesertaan" NOT NULL DEFAULT 'INDIVIDU',
    "namaTim" TEXT,
    "namaPrestasi" TEXT NOT NULL,
    "waktuPelaksanaan" DATE NOT NULL,
    "penyelenggara" TEXT NOT NULL,
    "kategori" "KategoriPrestasi" NOT NULL DEFAULT 'BERJENJANG',
    "tingkat" "TingkatPrestasi" NOT NULL DEFAULT 'KOTA',
    "catatan" TEXT,
    "isRemisiOtomatis" BOOLEAN NOT NULL DEFAULT true,
    "poinRemisi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fotoPiagam" TEXT,
    "fotoKegiatan" TEXT,
    "pelaporId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrestasiSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrestasiSiswaAnggota" (
    "id" TEXT NOT NULL,
    "prestasiId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,

    CONSTRAINT "PrestasiSiswaAnggota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nip_key" ON "User"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "TahunAjaran_nama_key" ON "TahunAjaran"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Kelas_walasId_key" ON "Kelas"("walasId");

-- CreateIndex
CREATE UNIQUE INDEX "Kelas_sekretarisId_key" ON "Kelas"("sekretarisId");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_nis_key" ON "Siswa"("nis");

-- CreateIndex
CREATE UNIQUE INDEX "SiswaKelas_siswaId_tahunAjaranId_key" ON "SiswaKelas"("siswaId", "tahunAjaranId");

-- CreateIndex
CREATE UNIQUE INDEX "KategoriPelanggaran_nama_key" ON "KategoriPelanggaran"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "MasterRemisi_nama_key" ON "MasterRemisi"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Absensi_siswaId_tanggal_key" ON "Absensi"("siswaId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "HariLibur_tanggal_key" ON "HariLibur"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PemanggilanSiswa_siswaId_thresholdPoints_key" ON "PemanggilanSiswa"("siswaId", "thresholdPoints");

-- CreateIndex
CREATE UNIQUE INDEX "MataPelajaran_kode_key" ON "MataPelajaran"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "PrestasiSiswaAnggota_prestasiId_siswaId_key" ON "PrestasiSiswaAnggota"("prestasiId", "siswaId");

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_walasId_fkey" FOREIGN KEY ("walasId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_bkId_fkey" FOREIGN KEY ("bkId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_sekretarisId_fkey" FOREIGN KEY ("sekretarisId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaKelas" ADD CONSTRAINT "SiswaKelas_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaKelas" ADD CONSTRAINT "SiswaKelas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaKelas" ADD CONSTRAINT "SiswaKelas_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailPelanggaran" ADD CONSTRAINT "DetailPelanggaran_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "KategoriPelanggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanPelanggaran" ADD CONSTRAINT "LaporanPelanggaran_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanPelanggaran" ADD CONSTRAINT "LaporanPelanggaran_detailPelanggaranId_fkey" FOREIGN KEY ("detailPelanggaranId") REFERENCES "DetailPelanggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanPelanggaran" ADD CONSTRAINT "LaporanPelanggaran_pelaporId_fkey" FOREIGN KEY ("pelaporId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanPelanggaran" ADD CONSTRAINT "LaporanPelanggaran_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiRemisi" ADD CONSTRAINT "TransaksiRemisi_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiRemisi" ADD CONSTRAINT "TransaksiRemisi_masterRemisiId_fkey" FOREIGN KEY ("masterRemisiId") REFERENCES "MasterRemisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiRemisi" ADD CONSTRAINT "TransaksiRemisi_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_pencatatId_fkey" FOREIGN KEY ("pencatatId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PemanggilanSiswa" ADD CONSTRAINT "PemanggilanSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenangananSiswa" ADD CONSTRAINT "PenangananSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenangananSiswa" ADD CONSTRAINT "PenangananSiswa_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RujukanSiswa" ADD CONSTRAINT "RujukanSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RujukanSiswa" ADD CONSTRAINT "RujukanSiswa_pembuatId_fkey" FOREIGN KEY ("pembuatId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BimbinganKonseling" ADD CONSTRAINT "BimbinganKonseling_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BimbinganKonseling" ADD CONSTRAINT "BimbinganKonseling_pembimbingId_fkey" FOREIGN KEY ("pembimbingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalPelajaran" ADD CONSTRAINT "JadwalPelajaran_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalPelajaran" ADD CONSTRAINT "JadwalPelajaran_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalPelajaran" ADD CONSTRAINT "JadwalPelajaran_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalMengajar" ADD CONSTRAINT "JurnalMengajar_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "JadwalPelajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalMengajar" ADD CONSTRAINT "JurnalMengajar_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalMengajar" ADD CONSTRAINT "JurnalMengajar_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalMengajar" ADD CONSTRAINT "JurnalMengajar_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalAbsensi" ADD CONSTRAINT "JurnalAbsensi_jurnalId_fkey" FOREIGN KEY ("jurnalId") REFERENCES "JurnalMengajar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalAbsensi" ADD CONSTRAINT "JurnalAbsensi_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalPenilaian" ADD CONSTRAINT "JurnalPenilaian_jurnalId_fkey" FOREIGN KEY ("jurnalId") REFERENCES "JurnalMengajar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalPenilaian" ADD CONSTRAINT "JurnalPenilaian_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestasiSiswa" ADD CONSTRAINT "PrestasiSiswa_pelaporId_fkey" FOREIGN KEY ("pelaporId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestasiSiswaAnggota" ADD CONSTRAINT "PrestasiSiswaAnggota_prestasiId_fkey" FOREIGN KEY ("prestasiId") REFERENCES "PrestasiSiswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestasiSiswaAnggota" ADD CONSTRAINT "PrestasiSiswaAnggota_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

