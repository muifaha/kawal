import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Clean Database
  await prisma.jurnalAbsensi.deleteMany({});
  await prisma.jurnalPenilaian.deleteMany({});
  await prisma.absensi.deleteMany({});
  await prisma.penilaianSiswa.deleteMany({});
  await prisma.penilaianKelas.deleteMany({});
  await prisma.tujuanPembelajaran.deleteMany({});
  await prisma.jurnalMengajar.deleteMany({});
  await prisma.jurnalDraft.deleteMany({});
  await prisma.jadwalPelajaran.deleteMany({});
  await prisma.mataPelajaran.deleteMany({});
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

  // 2. Passwords
  const hashWaka = await bcrypt.hash("waka123", 10);
  const hashBK = await bcrypt.hash("admin123", 10);
  const hashWalas = await bcrypt.hash("walas123", 10);
  const hashGuru = await bcrypt.hash("guru123", 10);
  const hashIfdlol = await bcrypt.hash("ifdlol123", 10);
  const hashOsis = await bcrypt.hash("osis123", 10);

  // 3. Users
  await prisma.user.create({
    data: {
      nip: "197508122000031001",
      username: "waka_admin",
      passwordHash: hashWaka,
      nama: "H. Mulyadi, M.Pd. (Waka Kesiswaan)",
      role: Role.WAKA,
    },
  });

  await prisma.user.create({
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
      whatsappNumber: "+6281234567890",
    },
  });

  await prisma.user.create({
    data: {
      nip: "199201202020081004",
      username: "guru_piket",
      passwordHash: hashGuru,
      nama: "Joko Susilo, S.Pd. (Guru Mapel)",
      role: Role.GURU,
    },
  });

  // Guru Muhammad Ifdlol Abdul Hafid
  const userIfdlol = await prisma.user.create({
    data: {
      nip: "199507212022031005",
      username: "ifdlol",
      passwordHash: hashIfdlol,
      nama: "Muhammad Ifdlol Abdul Hafid, S.Pd.",
      role: Role.GURU,
    },
  });

  await prisma.user.create({
    data: {
      username: "osis_siswa",
      passwordHash: hashOsis,
      nama: "Rian Hidayat (Ketua OSIS)",
      role: Role.OSIS,
    },
  });

  await prisma.user.create({
    data: {
      nip: "198505102010012005",
      username: "pembina_osis",
      passwordHash: hashOsis,
      nama: "Siti Rahmawati, S.Pd. (Pembina OSIS)",
      role: Role.PEMBINA_OSIS,
    },
  });

  console.log("Users created (including Muhammad Ifdlol).");

  // 4. Tahun Ajaran (2026/2027 Active)
  const ta2026 = await prisma.tahunAjaran.create({
    data: {
      nama: "2026/2027",
      isActive: true,
      semesterAktif: "GANJIL",
      ganjilMulai: new Date("2026-07-21"),
      ganjilSelesai: new Date("2026-12-06"),
      genapMulai: new Date("2027-01-05"),
      genapSelesai: new Date("2027-06-20"),
    },
  });

  console.log("Academic year 2026/2027 created & active.");

  // 5. Kelas XII C3
  const kelasC3 = await prisma.kelas.create({
    data: {
      nama: "XII C3",
      tahunAjaranId: ta2026.id,
      walasId: userWalas.id,
    },
  });

  // 6. Mata Pelajaran Sejarah
  const mapelSejarah = await prisma.mataPelajaran.create({
    data: {
      kode: "SEJ",
      nama: "Sejarah",
    },
  });

  // 7. Jadwal Pelajaran (Kamis = 4, XII C3, Sejarah, Guru Ifdlol, jam 1-3)
  const jadwalKamis = await prisma.jadwalPelajaran.create({
    data: {
      kelasId: kelasC3.id,
      mapelId: mapelSejarah.id,
      guruId: userIfdlol.id,
      hari: 4, // Kamis
      jamMulai: 1,
      jamSelesai: 3,
    },
  });

  // 8. Create 34 Siswa in XII C3
  const studentNames = [
    "Ahmad Fauzi", "Aditya Pratama", "Anisa Rahmawati", "Bagus Setiawan", "Bayu Saputra",
    "Citra Kirana", "Dian Sastro", "Dimas Anggara", "Eka Putri", "Fajar Ramadhan",
    "Fitriani Nur", "Gilang Perdana", "Hafizah Az-Zahra", "Irfan Hakim", "Indah Permata",
    "Joko Widodo", "Kurniawan Dwi", "Laila Majnun", "M. Rizky Febrian", "Nabila Syakieb",
    "Octavia Maharani", "Pratama Arhan", "Qori Sandioriva", "Rafi Ahmad", "Rina Nose",
    "Siti Nurhaliza", "Taufik Hidayat", "Umar bin Khattab", "Vina Panduwinata", "Wahyu Hidayat",
    "Xena Warrior", "Yusuf Mansur", "Zahra Humaira", "Zulfikar Ali"
  ];

  const siswaList = [];
  for (let i = 0; i < studentNames.length; i++) {
    const nisStr = (12001 + i).toString();
    const s = await prisma.siswa.create({
      data: {
        nis: nisStr,
        nisn: `006${nisStr}`,
        nama: studentNames[i],
        tanggalLahir: new Date("2008-05-15"),
      },
    });
    await prisma.siswaKelas.create({
      data: {
        siswaId: s.id,
        kelasId: kelasC3.id,
        tahunAjaranId: ta2026.id,
      },
    });
    siswaList.push(s);
  }
  console.log("34 Students created in XII C3.");

  // 9. Tujuan Pembelajaran (TP) - 4 TP Bab 1 & 4 TP Bab 2
  // BAB 1 REVOLUSI INDONESIA (4 TP)
  const tp1_1 = await prisma.tujuanPembelajaran.create({
    data: {
      guruId: userIfdlol.id,
      kelasId: kelasC3.id,
      mapelId: mapelSejarah.id,
      materi: "Bab 1 Revolusi Indonesia",
      kodeTp: "TP 1.1",
      deskripsi: "Menganalisis peristiwa Rengasdengklok dan perumusan naskah proklamasi kemerdekaan.",
      semester: 1,
    },
  });

  const tp1_2 = await prisma.tujuanPembelajaran.create({
    data: {
      guruId: userIfdlol.id,
      kelasId: kelasC3.id,
      mapelId: mapelSejarah.id,
      materi: "Bab 1 Revolusi Indonesia",
      kodeTp: "TP 1.2",
      deskripsi: "Mengevaluasi perjuangan fisik mempertahankan kemerdekaan (Surabaya, Ambarawa, Bandung).",
      semester: 1,
    },
  });

  const tp1_3 = await prisma.tujuanPembelajaran.create({
    data: {
      guruId: userIfdlol.id,
      kelasId: kelasC3.id,
      mapelId: mapelSejarah.id,
      materi: "Bab 1 Revolusi Indonesia",
      kodeTp: "TP 1.3",
      deskripsi: "Menganalisis perjuangan diplomasi internasional (Linggarjati, Renville, KMB).",
      semester: 1,
    },
  });

  const tp1_4 = await prisma.tujuanPembelajaran.create({
    data: {
      guruId: userIfdlol.id,
      kelasId: kelasC3.id,
      mapelId: mapelSejarah.id,
      materi: "Bab 1 Revolusi Indonesia",
      kodeTp: "TP 1.4",
      deskripsi: "Menjelaskan proses pembentukan kelengkapan negara dan pemerintahan pertama RI.",
      semester: 1,
    },
  });

  // BAB 2 MASA ORDE LAMA (4 TP)
  const tp2_1 = await prisma.tujuanPembelajaran.create({
    data: {
      guruId: userIfdlol.id,
      kelasId: kelasC3.id,
      mapelId: mapelSejarah.id,
      materi: "Bab 2 Masa Orde Lama",
      kodeTp: "TP 2.1",
      deskripsi: "Menganalisis sistem pemerintahan Demokrasi Liberal dan pergantian kabinet (1950-1959).",
      semester: 1,
    },
  });

  const tp2_2 = await prisma.tujuanPembelajaran.create({
    data: {
      guruId: userIfdlol.id,
      kelasId: kelasC3.id,
      mapelId: mapelSejarah.id,
      materi: "Bab 2 Masa Orde Lama",
      kodeTp: "TP 2.2",
      deskripsi: "Mengevaluasi pelaksanaan Pemilu 1955 dan latar belakang Dekrit Presiden 5 Juli 1959.",
      semester: 1,
    },
  });

  const tp2_3 = await prisma.tujuanPembelajaran.create({
    data: {
      guruId: userIfdlol.id,
      kelasId: kelasC3.id,
      mapelId: mapelSejarah.id,
      materi: "Bab 2 Masa Orde Lama",
      kodeTp: "TP 2.3",
      deskripsi: "Menganalisis pelaksanaan Demokrasi Terpimpin, konsep Nasakom, dan politik Mercusuar.",
      semester: 1,
    },
  });

  const tp2_4 = await prisma.tujuanPembelajaran.create({
    data: {
      guruId: userIfdlol.id,
      kelasId: kelasC3.id,
      mapelId: mapelSejarah.id,
      materi: "Bab 2 Masa Orde Lama",
      kodeTp: "TP 2.4",
      deskripsi: "Menjelaskan perjuangan pembebasan Irian Barat (Trikora) serta krisis politik 1965.",
      semester: 1,
    },
  });

  console.log("8 TP (4 TP Bab 1 & 4 TP Bab 2) created.");

  // 10. Generate 20 Thursday Teaching Journals & Attendance
  const thursdays = [
    "2026-07-23", "2026-07-30", "2026-08-06", "2026-08-13", "2026-08-20", "2026-08-27",
    "2026-09-03", "2026-09-10", "2026-09-17", "2026-09-24", "2026-10-01", "2026-10-08",
    "2026-10-15", "2026-10-22", "2026-10-29", "2026-11-05", "2026-11-12", "2026-11-19",
    "2026-11-26", "2026-12-03"
  ];

  const materiList = [
    "Pengantar Revolusi Kemerdekaan Indonesia 1945",
    "Peristiwa Rengasdengklok & Perumusan Teks Proklamasi",
    "Pembentukan Pemerintahan Republik Indonesia",
    "Perjuangan Fisik: Pertempuran Surabaya 10 November",
    "Perjuangan Fisik: Peristiwa Bandung Lautan Api & Ambarawa",
    "Perjuangan Diplomasi: Perjanjian Linggarjati",
    "Agresi Militer Belanda I & Perjanjian Renville",
    "Agresi Militer Belanda II & Serangan Umum 1 Maret 1949",
    "Konferensi Meja Bundar (KMB) & Pengakuan Kedaulatan",
    "Evaluasi Bab 1 Revolusi Indonesia",
    "Pengantar Masa Demokrasi Liberal (1950-1959)",
    "Sistem Kepartaian & Kabinet-Kabinet Masa Demokrasi Liberal",
    "Pemilu Pertama 1955 & Dekrit Presiden 5 Juli 1959",
    "Masa Demokrasi Terpimpin & Konsep Nasakom",
    "Politik Luar Negeri Bebas Aktif & Konfrontasi Malaysia",
    "Pembebasan Irian Barat & Perjanjian New York",
    "Krisis Ekonomi & Gunting Syafruddin Masa Orde Lama",
    "Peristiwa G30S/PKI dan Akhir Masa Orde Lama",
    "Review Materi Sejarah Indonesia Semester Ganjil",
    "Refleksi & Persiapan Asesmen Akhir Semester"
  ];

  for (let idx = 0; idx < thursdays.length; idx++) {
    const dateStr = thursdays[idx];
    const materiStr = materiList[idx] || `Pembelajaran Sejarah Pertemuan ke-${idx + 1}`;
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

    const jurnal = await prisma.jurnalMengajar.create({
      data: {
        guruId: userIfdlol.id,
        kelasId: kelasC3.id,
        mapelId: mapelSejarah.id,
        jadwalId: jadwalKamis.id,
        tanggal: dateObj,
        jamMulai: 1,
        jamSelesai: 3,
        namaJurnal: `Agenda Pertemuan Ke-${idx + 1}`,
        kegiatan: materiStr,
        rencanaAksi: "Diskusi kelompok, pemutaran dokumen sejarah, & latihan kuis.",
      },
    });

    for (let sIdx = 0; sIdx < siswaList.length; sIdx++) {
      let statusStr = "H";
      if (sIdx === (idx % 34)) statusStr = "S";
      else if (sIdx === ((idx + 5) % 34)) statusStr = "I";
      else if (sIdx === ((idx + 10) % 34)) statusStr = "D";

      await prisma.jurnalAbsensi.create({
        data: {
          jurnalId: jurnal.id,
          siswaId: siswaList[sIdx].id,
          status: statusStr,
        },
      });
    }
  }

  console.log("20 Thursday Teaching Journals & Attendance records created.");

  // 11. DAFTAR PENILAIAN LENGKAP (1-3 Formatif per TP + Sumatif Bab + PAS)
  const penilaianConfigs = [
    // --- BAB 1 REVOLUSI INDONESIA ---
    // TP 1.1 (3 Formatif)
    {
      nama: "Latihan Soal TP 1.1 - Peristiwa Rengasdengklok",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.1",
      tanggal: "2026-07-30",
      deskripsi: "Latihan pemahaman latar belakang penculikan Rengasdengklok."
    },
    {
      nama: "Mengerjakan LKPD TP 1.1 - Tokoh Perumus Proklamasi",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.1",
      tanggal: "2026-08-06",
      deskripsi: "Tugas kelompok menganalisis peran Ir. Soekarno, Moh. Hatta, dan Ahmad Soebardjo."
    },
    {
      nama: "Kuis Singkat TP 1.1 - Detik-Detik Proklamasi 17 Agustus",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.1",
      tanggal: "2026-08-13",
      deskripsi: "Kuis lisan dan esai singkat pembacaan naskah proklamasi."
    },

    // TP 1.2 (2 Formatif)
    {
      nama: "Latihan Soal TP 1.2 - Pertempuran Surabaya & Ambarawa",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.2",
      tanggal: "2026-08-20",
      deskripsi: "Latihan pilihan ganda dan analisis strategi perang gerilya."
    },
    {
      nama: "Mengerjakan LKPD TP 1.2 - Peristiwa Bandung Lautan Api",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.2",
      tanggal: "2026-08-27",
      deskripsi: "Lembar kerja peserta didik mengenai taktik bumi hangus di Bandung."
    },

    // TP 1.3 (3 Formatif)
    {
      nama: "Latihan Soal TP 1.3 - Perjanjian Linggarjati & Renville",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.3",
      tanggal: "2026-09-03",
      deskripsi: "Studi kasus kerugian dan keuntungan Indonesia dalam perundingan."
    },
    {
      nama: "Mengerjakan LKPD TP 1.3 - Agresi Militer Belanda & PDRI",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.3",
      tanggal: "2026-09-10",
      deskripsi: "Analisis peran Pemerintah Darurat Republik Indonesia (PDRI) di Bukittinggi."
    },
    {
      nama: "Kuis Singkat TP 1.3 - Konferensi Meja Bundar (KMB)",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.3",
      tanggal: "2026-09-17",
      deskripsi: "Kuis singkat hasil keputusan KMB 1949 di Den Haag."
    },

    // TP 1.4 (2 Formatif)
    {
      nama: "Latihan Soal TP 1.4 - Pembentukan KNIP & 8 Provinsi Pertama",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.4",
      tanggal: "2026-09-24",
      deskripsi: "Latihan struktur kelembagaan negara pasca sidang PPKI."
    },
    {
      nama: "Mengerjakan LKPD TP 1.4 - Maklumat Pemerintah 14 November 1945",
      jenis: "FORMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "TP 1.4",
      tanggal: "2026-10-01",
      deskripsi: "Tugas pemikiran perubahan sistem presidensial menjadi parlementer."
    },

    // SUMATIF BAB 1
    {
      nama: "Ulangan Bab 1 Revolusi Indonesia",
      jenis: "SUMATIF",
      materi: "Bab 1 Revolusi Indonesia",
      tpCode: "",
      tanggal: "2026-10-08",
      deskripsi: "Tes ulangan harian tertulis penilaian pencapaian Bab 1 Revolusi Indonesia."
    },

    // --- BAB 2 MASA ORDE LAMA ---
    // TP 2.1 (2 Formatif)
    {
      nama: "Latihan Soal TP 2.1 - Sistem Kabinet Demokrasi Liberal",
      jenis: "FORMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "TP 2.1",
      tanggal: "2026-10-15",
      deskripsi: "Latihan penyebab jatuh bangunnya 7 kabinet masa Demokrasi Liberal."
    },
    {
      nama: "Mengerjakan LKPD TP 2.1 - Program Kerja Kabinet Ali Sastroamidjojo",
      jenis: "FORMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "TP 2.1",
      tanggal: "2026-10-22",
      deskripsi: "LKPD analisis penyelenggaraan Konferensi Asia Afrika (KAA) 1955."
    },

    // TP 2.2 (3 Formatif)
    {
      nama: "Latihan Soal TP 2.2 - Pelaksanaan Pemilu Pertama 1955",
      jenis: "FORMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "TP 2.2",
      tanggal: "2026-10-29",
      deskripsi: "Latihan soal perolehan suara 4 partai besar Pemilu 1955."
    },
    {
      nama: "Mengerjakan LKPD TP 2.2 - Kegagalan Konstituante Menyusun UUD",
      jenis: "FORMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "TP 2.2",
      tanggal: "2026-11-05",
      deskripsi: "Lembar kerja analisis faktor kemacetan sidang Konstituante."
    },
    {
      nama: "Kuis Singkat TP 2.2 - Isi Dekrit Presiden 5 Juli 1959",
      jenis: "FORMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "TP 2.2",
      tanggal: "2026-11-12",
      deskripsi: "Kuis hafalan & analisis 3 poin utama Dekrit Presiden."
    },

    // TP 2.3 (2 Formatif)
    {
      nama: "Latihan Soal TP 2.3 - Demokrasi Terpimpin & Ajaran Nasakom",
      jenis: "FORMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "TP 2.3",
      tanggal: "2026-11-19",
      deskripsi: "Latihan pemusatan kekuasaan dan penyimpangan politik Orde Lama."
    },
    {
      nama: "Mengerjakan LKPD TP 2.3 - Politik Mercusuar & Ganefo",
      jenis: "FORMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "TP 2.3",
      tanggal: "2026-11-26",
      deskripsi: "LKPD dampak proyek Mercusuar terhadap perekonomian negara."
    },

    // TP 2.4 (2 Formatif)
    {
      nama: "Latihan Soal TP 2.4 - Perjuangan Pembebasan Irian Barat (Trikora)",
      jenis: "FORMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "TP 2.4",
      tanggal: "2026-12-01",
      deskripsi: "Latihan soal Operasi Mandala & Perjanjian New York."
    },
    {
      nama: "Mengerjakan LKPD TP 2.4 - Peristiwa G30S/PKI & Tritura",
      jenis: "FORMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "TP 2.4",
      tanggal: "2026-12-03",
      deskripsi: "LKPD krisis sosial politik akhir Orde Lama & tuntutan Tritura."
    },

    // SUMATIF BAB 2
    {
      nama: "Ulangan Bab 2 Masa Orde Lama",
      jenis: "SUMATIF",
      materi: "Bab 2 Masa Orde Lama",
      tpCode: "",
      tanggal: "2026-12-04",
      deskripsi: "Tes ulangan harian tertulis evaluasi Bab 2 Masa Orde Lama."
    },

    // SUMATIF AKHIR SEMESTER (PAS)
    {
      nama: "Asesmen Akhir Semester (PAS) Sejarah",
      jenis: "PAS_UAS",
      materi: "",
      tpCode: "",
      tanggal: "2026-12-05",
      deskripsi: "Ujian komprehensif semester ganjil materi Bab 1 & Bab 2."
    },
  ];

  console.log(`Creating ${penilaianConfigs.length} Assessment Headers & Student Scores...`);

  for (let pIdx = 0; pIdx < penilaianConfigs.length; pIdx++) {
    const pConf = penilaianConfigs[pIdx];
    const penHeader = await prisma.penilaianKelas.create({
      data: {
        guruId: userIfdlol.id,
        kelasId: kelasC3.id,
        mapelId: mapelSejarah.id,
        namaPenilaian: pConf.nama,
        jenisPenilaian: pConf.jenis,
        materi: pConf.materi || null,
        tpCode: pConf.tpCode || null,
        tanggal: new Date(`${pConf.tanggal}T00:00:00.000Z`),
        deskripsi: pConf.deskripsi,
      },
    });

    // Populate realistic scores for all 34 students
    for (let sIdx = 0; sIdx < siswaList.length; sIdx++) {
      // Deterministic but realistic score pattern between 68 and 98
      const baseScore = 72 + ((sIdx * 11 + pIdx * 7) % 24);
      const isBonus = (sIdx + pIdx) % 5 === 0;
      const finalNilai = Math.min(98, baseScore + (isBonus ? 5 : 0));

      let catatanStr = "Tuntas dengan baik.";
      if (finalNilai >= 90) {
        catatanStr = "Sangat menguasai materi dengan analisis tajam.";
      } else if (finalNilai >= 80) {
        catatanStr = "Menguasai materi dengan baik.";
      } else if (finalNilai < 75) {
        catatanStr = "Perlu pendampingan belajar dan latihan tambahan.";
      }

      await prisma.penilaianSiswa.create({
        data: {
          penilaianKelasId: penHeader.id,
          siswaId: siswaList[sIdx].id,
          nilai: finalNilai,
          catatan: catatanStr,
        },
      });
    }
  }

  console.log(`Successfully generated ${penilaianConfigs.length} assessment headers and ${penilaianConfigs.length * 34} student grades!`);

  // 12. Kategori Pelanggaran & Master Remisi
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
    ],
  });

  await prisma.masterRemisi.createMany({
    data: [
      { nama: "Bawa Pohon untuk Penghijauan", persentasePengurangan: 15 },
      { nama: "Kerja Bakti Lingkungan", persentasePengurangan: 10 },
      { nama: "Pemutihan Kenaikan Kelas", persentasePengurangan: 20 },
    ],
  });

  console.log("Violation categories & master remissions created.");
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
