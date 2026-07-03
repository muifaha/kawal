import { PrismaClient, AttendanceStatus, ViolationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function runTest() {
  console.log("\n=================== INTEGRATION TEST SIMULATION ===================");

  try {
    // 1. Dapatkan Data Dummy dari Seeding
    const studentAhmad = await prisma.siswa.findFirst({
      where: { nama: "Ahmad Subagja" },
      include: {
        riwayatKelas: {
          where: { tahunAjaran: { isActive: true } },
          include: { kelas: true },
        },
      },
    });
    const studentBudi = await prisma.siswa.findFirst({
      where: { nama: "Budi Utomo" },
      include: {
        riwayatKelas: {
          where: { tahunAjaran: { isActive: true } },
          include: { kelas: true },
        },
      },
    });
    const userBK = await prisma.user.findFirst({ where: { role: "BK" } });
    const userGuru = await prisma.user.findFirst({ where: { role: "GURU" } });
    const detailDasi = await prisma.detailPelanggaran.findFirst({
      where: { nama: "Tidak memakai dasi" },
    });
    const detailBolos = await prisma.detailPelanggaran.findFirst({
      where: { nama: "Membolos jam pelajaran" },
    });
    const masterRemisiPohon = await prisma.masterRemisi.findFirst({
      where: { nama: "Bawa Pohon untuk Penghijauan" },
    });

    if (!studentAhmad || !studentBudi || !userBK || !userGuru || !detailDasi || !detailBolos || !masterRemisiPohon) {
      throw new Error("Data seeding awal tidak lengkap untuk menjalankan pengujian.");
    }

    console.log("✓ Data prasyarat berhasil di-load.");

    // ==========================================
    // TEST 1: ALUR ABSENSI
    // ==========================================
    console.log("\n--- TEST 1: Pencatatan Absensi ---");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Simpan Ahmad sebagai Sakit (S)
    await prisma.absensi.upsert({
      where: {
        siswaId_tanggal: { siswaId: studentAhmad.id, tanggal: today },
      },
      update: { status: AttendanceStatus.S, pencatatId: userBK.id },
      create: { siswaId: studentAhmad.id, tanggal: today, status: AttendanceStatus.S, pencatatId: userBK.id },
    });

    // Simpan Budi sebagai Hadir (H)
    await prisma.absensi.upsert({
      where: {
        siswaId_tanggal: { siswaId: studentBudi.id, tanggal: today },
      },
      update: { status: AttendanceStatus.H, pencatatId: userBK.id },
      create: { siswaId: studentBudi.id, tanggal: today, status: AttendanceStatus.H, pencatatId: userBK.id },
    });

    const checkAbsen = await prisma.absensi.findFirst({
      where: { siswaId: studentAhmad.id, tanggal: today },
    });
    console.log(`Ahmad Absensi Hari Ini: ${checkAbsen?.status} (Ekspektasi: S)`);
    if (checkAbsen?.status !== "S") throw new Error("Gagal memvalidasi status absensi Sakit.");
    console.log("✓ Test 1 Berhasil.");

    // ==========================================
    // TEST 2: PENGAJUAN PELANGGARAN OLEH GURU (PENDING)
    // ==========================================
    console.log("\n--- TEST 2: Pengajuan Pelanggaran (Status PENDING) ---");
    const laporanPending = await prisma.laporanPelanggaran.create({
      data: {
        siswaId: studentAhmad.id,
        detailPelanggaranId: detailDasi.id,
        pelaporId: userGuru.id,
        status: ViolationStatus.PENDING,
      },
    });

    console.log(`Laporan dibuat. Status: ${laporanPending.status} (Ekspektasi: PENDING)`);
    if (laporanPending.status !== "PENDING") throw new Error("Status harus PENDING.");

    // Hitung poin berjalan Ahmad (harus tetap 0 karena masih PENDING)
    let ahmadViolations = await prisma.laporanPelanggaran.findMany({
      where: { siswaId: studentAhmad.id, status: ViolationStatus.APPROVED },
      include: { detailPelanggaran: true },
    });
    let ahmadPoints = ahmadViolations.reduce((sum, v) => sum + v.detailPelanggaran.poin, 0);
    console.log(`Poin Akumulasi Ahmad saat PENDING: ${ahmadPoints} (Ekspektasi: 0)`);
    if (ahmadPoints !== 0) throw new Error("Poin pending tidak boleh diakumulasikan.");
    console.log("✓ Test 2 Berhasil.");

    // ==========================================
    // TEST 3: APPROVAL OLEH BK (PENDING -> APPROVED)
    // ==========================================
    console.log("\n--- TEST 3: Persetujuan Laporan (APPROVED & Akumulasi Poin) ---");
    await prisma.laporanPelanggaran.update({
      where: { id: laporanPending.id },
      data: {
        status: ViolationStatus.APPROVED,
        approverId: userBK.id,
        approvedAt: new Date(),
      },
    });

    // Hitung kembali poin Ahmad
    ahmadViolations = await prisma.laporanPelanggaran.findMany({
      where: { siswaId: studentAhmad.id, status: ViolationStatus.APPROVED },
      include: { detailPelanggaran: true },
    });
    ahmadPoints = ahmadViolations.reduce((sum, v) => sum + v.detailPelanggaran.poin, 0);
    console.log(`Poin Akumulasi Ahmad setelah disetujui: ${ahmadPoints} (Ekspektasi: 5)`);
    if (ahmadPoints !== 5) throw new Error("Poin akumulasi salah.");
    console.log("✓ Test 3 Berhasil.");

    // ==========================================
    // TEST 4: REMISI KONDISIONAL (MANUAL)
    // ==========================================
    console.log("\n--- TEST 4: Penerapan Remisi Kondisional ---");
    // Hitung poin berjalan (5)
    // Remisi: Bawa Pohon (15%). 15% dari 5 = 0.75, dibulatkan ke atas jadi 1 poin.
    const reductionPercent = masterRemisiPohon.persentasePengurangan;
    const pointsToReduce = Math.max(1, Math.round(ahmadPoints * (reductionPercent / 100)));

    await prisma.transaksiRemisi.create({
      data: {
        siswaId: studentAhmad.id,
        jenis: "KONDISIONAL",
        masterRemisiId: masterRemisiPohon.id,
        poinDikurangi: pointsToReduce,
        approverId: userBK.id,
      },
    });

    // Hitung Poin Net
    const ahmadRemisis = await prisma.transaksiRemisi.findMany({ where: { siswaId: studentAhmad.id } });
    const totalRemisi = ahmadRemisis.reduce((sum, r) => sum + r.poinDikurangi, 0);
    const netPoints = Math.max(0, ahmadPoints - totalRemisi);
    console.log(`Total Pengurangan: ${totalRemisi} Poin (Ekspektasi: 1)`);
    console.log(`Poin Net Akhir Ahmad: ${netPoints} Poin (Ekspektasi: 4)`);
    if (netPoints !== 4) throw new Error("Perhitungan remisi salah.");
    console.log("✓ Test 4 Berhasil.");

    // ==========================================
    // TEST 5: REMISI OTOMATIS BULANAN (BERSIH PELANGGARAN)
    // ==========================================
    console.log("\n--- TEST 5: Pemindaian Remisi Otomatis Bulanan ---");
    // Berikan Budi pelanggaran APPROVED yang terjadi 40 HARI LALU
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    const oldLaporan = await prisma.laporanPelanggaran.create({
      data: {
        siswaId: studentBudi.id,
        detailPelanggaranId: detailBolos.id, // 15 Poin
        pelaporId: userGuru.id,
        status: ViolationStatus.APPROVED,
        tanggal: fortyDaysAgo,
        approverId: userBK.id,
        approvedAt: fortyDaysAgo,
      },
    });

    // Hitung poin awal Budi
    let budiViolations = await prisma.laporanPelanggaran.findMany({
      where: { siswaId: studentBudi.id, status: ViolationStatus.APPROVED },
      include: { detailPelanggaran: true },
    });
    let budiPoints = budiViolations.reduce((sum, v) => sum + v.detailPelanggaran.poin, 0);
    console.log(`Poin Awal Budi (Pelanggaran 40 hari lalu): ${budiPoints} (Ekspektasi: 15)`);

    // Jalankan pemindaian otomatis untuk Budi
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Cek apakah bersih dari pelanggaran dalam 30 hari terakhir
    const hasRecentViolations = await prisma.laporanPelanggaran.findFirst({
      where: {
        siswaId: studentBudi.id,
        status: ViolationStatus.APPROVED,
        tanggal: { gte: thirtyDaysAgo },
      },
    });

    console.log(`Apakah Budi melakukan pelanggaran 30 hari terakhir? ${hasRecentViolations ? "Ya" : "Tidak"} (Ekspektasi: Tidak)`);

    if (!hasRecentViolations) {
      // Potongan 10%
      const budiReduction = Math.max(1, Math.round(budiPoints * 0.1)); // 10% dari 15 = 1.5 -> 2 Poin
      await prisma.transaksiRemisi.create({
        data: {
          siswaId: studentBudi.id,
          jenis: "OTOMATIS",
          poinDikurangi: budiReduction,
          approverId: userBK.id,
        },
      });

      const budiRemisis = await prisma.transaksiRemisi.findMany({ where: { siswaId: studentBudi.id } });
      const budiTotalRemisi = budiRemisis.reduce((sum, r) => sum + r.poinDikurangi, 0);
      const budiNetPoints = Math.max(0, budiPoints - budiTotalRemisi);
      console.log(`Remisi Otomatis Diberikan: -${budiReduction} Poin (Ekspektasi: 2)`);
      console.log(`Poin Net Akhir Budi: ${budiNetPoints} Poin (Ekspektasi: 13)`);
      if (budiNetPoints !== 13) throw new Error("Perhitungan remisi otomatis salah.");
    }
    console.log("✓ Test 5 Berhasil.");

    // Clean up data tes (opsional agar database kembali bersih/seeded)
    await prisma.absensi.deleteMany({ where: { tanggal: today } });
    await prisma.laporanPelanggaran.deleteMany({ where: { id: { in: [laporanPending.id, oldLaporan.id] } } });
    await prisma.transaksiRemisi.deleteMany({ where: { siswaId: { in: [studentAhmad.id, studentBudi.id] } } });
    console.log("\nClean up data tes selesai.");
    
    console.log("\n=================== SEMUA PENGUJIAN SUKSES! ===================");

  } catch (error) {
    console.error("\n❌ PENGUJIAN GAGAL:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
