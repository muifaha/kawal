import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed for Guru Muhammad Ifdlol & Kelas XII C3...");

  // 1. Buat / Update Guru Muhammad Ifdlol Abdul Hafid
  const passwordHash = await bcrypt.hash("password123", 10);
  const guru = await prisma.user.upsert({
    where: { username: "ifdlol" },
    update: {
      nama: "Muhammad Ifdlol Abdul Hafid",
      nip: "198807212012011003",
      role: "GURU",
      passwordHash,
    },
    create: {
      username: "ifdlol",
      nama: "Muhammad Ifdlol Abdul Hafid",
      nip: "198807212012011003",
      role: "GURU",
      passwordHash,
    },
  });
  console.log(`✅ Guru: ${guru.nama} (${guru.username})`);

  // 2. Buat / Update Mata Pelajaran Sejarah
  const mapel = await prisma.mataPelajaran.upsert({
    where: { kode: "SEJ" },
    update: { nama: "Sejarah" },
    create: {
      kode: "SEJ",
      nama: "Sejarah",
    },
  });
  console.log(`✅ Mapel: ${mapel.nama} (${mapel.kode})`);

  // 3. Buat / Aktifkan Tahun Pelajaran 2026/2027
  // Nonaktifkan TA lain terlebih dahulu
  await prisma.tahunAjaran.updateMany({ data: { isActive: false } });

  const ta = await prisma.tahunAjaran.upsert({
    where: { nama: "2026/2027" },
    update: {
      isActive: true,
      semesterAktif: "GANJIL",
      ganjilMulai: new Date("2026-07-21"),
      ganjilSelesai: new Date("2026-12-06"),
    },
    create: {
      nama: "2026/2027",
      isActive: true,
      semesterAktif: "GANJIL",
      ganjilMulai: new Date("2026-07-21"),
      ganjilSelesai: new Date("2026-12-06"),
    },
  });
  console.log(`✅ Tahun Pelajaran: ${ta.nama} (Aktif: Ganjil, 21 Juli - 6 Des 2026)`);

  // 4. Buat Kelas XII C3
  let kelas = await prisma.kelas.findFirst({
    where: { nama: "XII C3", tahunAjaranId: ta.id },
  });
  if (!kelas) {
    kelas = await prisma.kelas.create({
      data: {
        nama: "XII C3",
        tahunAjaranId: ta.id,
        walasId: guru.id,
      },
    });
  }
  console.log(`✅ Kelas: ${kelas.nama}`);

  // 5. Buat 34 Siswa untuk Kelas XII C3
  const studentNames = [
    "Aditia Pratama", "Annisa Rahmawati", "Bayu Setiawan", "Cantika Putri", "Daffa Ahmad",
    "Dian Sastrowardoyo", "Eka Nur Aini", "Fadel Muhammad", "Gading Marten", "Hana Pertiwi",
    "Indah Permata", "Jaya Kusuma", "Kevin Sanjaya", "Larasati Dewi", "M. Rizky Pratama",
    "Nabila Syakieb", "Oki Setiana", "Putri Amelia", "Qori Sandioriva", "Raditya Dika",
    "Rian Ardianto", "Sinta Nuriyah", "Taufik Hidayat", "Utama Putra", "Vina Panduwinata",
    "Wahyu Hidayat", "Xena Warrior", "Yuni Shara", "Zahra Salsabila", "Achmad Zaky",
    "Bambang Pamungkas", "Cita Citata", "Doni Monardo", "Erigo Putra"
  ];

  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const nis = `2627${String(i + 1).padStart(2, "0")}`;
    const nisn = `0082627${String(i + 1).padStart(3, "0")}`;
    const sName = studentNames[i];

    const s = await prisma.siswa.upsert({
      where: { nis },
      update: { nama: sName, nisn, status: "AKTIF" },
      create: {
        nis,
        nisn,
        nama: sName,
        status: "AKTIF",
      },
    });

    // Daftarkan ke SiswaKelas
    await prisma.siswaKelas.upsert({
      where: {
        siswaId_tahunAjaranId: {
          siswaId: s.id,
          tahunAjaranId: ta.id,
        },
      },
      update: { kelasId: kelas.id },
      create: {
        siswaId: s.id,
        kelasId: kelas.id,
        tahunAjaranId: ta.id,
      },
    });

    students.push(s);
  }
  console.log(`✅ ${students.length} Siswa berhasil didaftarkan di Kelas XII C3.`);

  // 6. Buat Tujuan Pembelajaran (TP)
  // Bab 1: Revolusi Indonesia (2 TP)
  // Bab 2: Masa Orde Lama (4 TP)
  const tpData = [
    {
      materi: "Bab 1: Revolusi Indonesia",
      kodeTp: "TP-SEJ-01",
      deskripsi: "Menganalisis latar belakang, kronologi, dan tokoh-tokoh kunci Proklamasi Kemerdekaan Indonesia 17 Agustus 1945.",
      semester: 1,
    },
    {
      materi: "Bab 1: Revolusi Indonesia",
      kodeTp: "TP-SEJ-02",
      deskripsi: "Mengevaluasi bentuk-bentuk perjuangan diplomasi dan fisik dalam mempertahankan kemerdekaan Indonesia (1945–1949).",
      semester: 1,
    },
    {
      materi: "Bab 2: Masa Orde Lama",
      kodeTp: "TP-SEJ-03",
      deskripsi: "Menganalisis dinamika politik pemerintahan masa Demokrasi Liberal dan sistem Kabinet Parlementer (1950–1959).",
      semester: 1,
    },
    {
      materi: "Bab 2: Masa Orde Lama",
      kodeTp: "TP-SEJ-04",
      deskripsi: "Memahami latar belakang, isi, serta dampak diberlakukannya Dekrit Presiden 5 Juli 1959.",
      semester: 1,
    },
    {
      materi: "Bab 2: Masa Orde Lama",
      kodeTp: "TP-SEJ-05",
      deskripsi: "Mengevaluasi kebijakan politik luar negeri bebas aktif masa Demokrasi Terpimpin (Gerakan Non-Blok, Dwikora, GANEFO).",
      semester: 1,
    },
    {
      materi: "Bab 2: Masa Orde Lama",
      kodeTp: "TP-SEJ-06",
      deskripsi: "Menganalisis kondisi ekonomi nasional, hiperinflasi, dan krisis politik akhir masa Orde Lama (Tritura & G30S/PKI).",
      semester: 1,
    },
  ];

  const createdTPs = [];
  for (const item of tpData) {
    let tp = await prisma.tujuanPembelajaran.findFirst({
      where: {
        guruId: guru.id,
        mapelId: mapel.id,
        kodeTp: item.kodeTp,
      },
    });
    if (!tp) {
      tp = await prisma.tujuanPembelajaran.create({
        data: {
          guruId: guru.id,
          kelasId: kelas.id,
          mapelId: mapel.id,
          tingkatKelas: "XII",
          materi: item.materi,
          kodeTp: item.kodeTp,
          deskripsi: item.deskripsi,
          semester: item.semester,
        },
      });
    } else {
      tp = await prisma.tujuanPembelajaran.update({
        where: { id: tp.id },
        data: {
          materi: item.materi,
          deskripsi: item.deskripsi,
        },
      });
    }
    createdTPs.push(tp);
  }
  console.log(`✅ ${createdTPs.length} Tujuan Pembelajaran (TP) berhasil dibuat (Bab 1: 2 TP, Bab 2: 4 TP).`);

  // 7. Jadwal Mengajar (Hari Kamis)
  let jadwal = await prisma.jadwalPelajaran.findFirst({
    where: {
      guruId: guru.id,
      kelasId: kelas.id,
      mapelId: mapel.id,
      hari: 4, // Kamis
    },
  });
  if (!jadwal) {
    jadwal = await prisma.jadwalPelajaran.create({
      data: {
        guruId: guru.id,
        kelasId: kelas.id,
        mapelId: mapel.id,
        hari: 4,
        jamMulai: 1,
        jamSelesai: 3,
      },
    });
  }
  console.log(`✅ Jadwal Mengajar: Hari Kamis Jam 1-3 di Kelas XII C3.`);

  // 8. Buat Jurnal Mengajar Setiap Hari Kamis dari 21 Juli 2026 s.d. 6 Desember 2026
  // Tanggal Hari Kamis:
  const thursdayDates = [
    { date: "2026-07-23", title: "Pertemuan 1", topic: "Pengantar Sejarah Kemerdekaan & Proklamasi 1945 (TP-SEJ-01)" },
    { date: "2026-07-30", title: "Pertemuan 2", topic: "Proses Perumusan Teks Proklamasi & Tokoh Kunci (TP-SEJ-01)" },
    { date: "2026-08-06", title: "Pertemuan 3", topic: "Perjuangan Fisik Mempertahankan Kemerdekaan 1945-1949 (TP-SEJ-02)" },
    { date: "2026-08-13", title: "Pertemuan 4", topic: "Perjuangan Diplomasi: Perjanjian Linggarjati & Renville (TP-SEJ-02)" },
    { date: "2026-08-20", title: "Pertemuan 5", topic: "Agresi Militer Belanda & Konferensi Meja Bundar (TP-SEJ-02)" },
    { date: "2026-08-27", title: "Pertemuan 6", topic: "Evaluasi Bab 1 Revolusi Indonesia & Refleksi Pembelajaran" },
    { date: "2026-09-03", title: "Pertemuan 7", topic: "Awal Demokrasi Liberal & Sistem Kabinet Parlementer (TP-SEJ-03)" },
    { date: "2026-09-10", title: "Pertemuan 8", topic: "Pemilu Pertama Tahun 1955 & Jatuh Bangun Kabinet (TP-SEJ-03)" },
    { date: "2026-09-17", title: "Pertemuan 9", topic: "Krisis Politik & Latar Belakang Dekrit Presiden (TP-SEJ-04)" },
    { date: "2026-09-24", title: "Pertemuan 10", topic: "Dekrit Presiden 5 Juli 1959 & Peralihan ke Demokrasi Terpimpin (TP-SEJ-04)" },
    { date: "2026-10-01", title: "Pertemuan 11", topic: "Pelaksanaan Sumatif Tengah Semester (STS) Sejarah" },
    { date: "2026-10-08", title: "Pertemuan 12", topic: "Politik Luar Negeri Bebas Aktif & Deklarasi Djuanda (TP-SEJ-05)" },
    { date: "2026-10-15", title: "Pertemuan 13", topic: "Peran Indonesia dalam Gerakan Non-Blok & KAA (TP-SEJ-05)" },
    { date: "2026-10-22", title: "Pertemuan 14", topic: "Konfrontasi Dwikora & Pembentukan GANEFO (TP-SEJ-05)" },
    { date: "2026-10-29", title: "Pertemuan 15", topic: "Kondisi Ekonomi Masa Orde Lama & Hiperinflasi (TP-SEJ-06)" },
    { date: "2026-11-05", title: "Pertemuan 16", topic: "Kebijakan Gunting Sjafruddin & Deklarasi Ekonomi (TP-SEJ-06)" },
    { date: "2026-11-12", title: "Pertemuan 17", topic: "Krisis Politik Akhir Orde Lama & Peristiwa 1965 (TP-SEJ-06)" },
    { date: "2026-11-19", title: "Pertemuan 18", topic: "Lahirnya Tritura & Transisi Menuju Orde Baru (TP-SEJ-06)" },
    { date: "2026-11-26", title: "Pertemuan 19", topic: "Review & Pengayaan Materi Persiapan Sumatif Akhir Semester" },
    { date: "2026-12-03", title: "Pertemuan 20", topic: "Pelaksanaan Sumatif Akhir Semester (SAS) Sejarah" },
  ];

  // Bersihkan jurnal lama untuk kelas ini jika ada
  await prisma.jurnalMengajar.deleteMany({
    where: { kelasId: kelas.id, mapelId: mapel.id },
  });

  const createdJournals = [];
  for (const thurs of thursdayDates) {
    const tDate = new Date(thurs.date);

    const j = await prisma.jurnalMengajar.create({
      data: {
        jadwalId: jadwal.id,
        kelasId: kelas.id,
        guruId: guru.id,
        mapelId: mapel.id,
        jamMulai: 1,
        jamSelesai: 3,
        tanggal: tDate,
        namaJurnal: thurs.title,
        kegiatan: thurs.topic,
        rencanaAksi: "Melaksanakan pembelajaran sejarah interaktif dan diskusi kelompok berpusat pada siswa.",
      },
    });

    // Buat Absensi untuk 34 Siswa dengan variasi (Hadir, Sakit, Izin, Dispen, Alpha)
    const absensiData = [];
    for (let sIdx = 0; sIdx < students.length; sIdx++) {
      const student = students[sIdx];

      // Variasi Absensi Realistis
      let status = "H";
      // Beberapa siswa tertentu memiliki beberapa kali Sakit / Izin / Dispen / Alpha
      if (sIdx === 3 && (thurs.title === "Pertemuan 4" || thurs.title === "Pertemuan 12")) {
        status = "S";
      } else if (sIdx === 7 && (thurs.title === "Pertemuan 8" || thurs.title === "Pertemuan 15")) {
        status = "I";
      } else if (sIdx === 12 && thurs.title === "Pertemuan 6") {
        status = "D";
      } else if (sIdx === 18 && thurs.title === "Pertemuan 14") {
        status = "A";
      } else if (sIdx === 25 && thurs.title === "Pertemuan 3") {
        status = "S";
      } else if (sIdx === 31 && thurs.title === "Pertemuan 9") {
        status = "I";
      }

      absensiData.push({
        jurnalId: j.id,
        siswaId: student.id,
        status,
      });
    }

    await prisma.jurnalAbsensi.createMany({
      data: absensiData,
    });

    createdJournals.push(j);
  }
  console.log(`✅ ${createdJournals.length} Jurnal Mengajar Hari Kamis (Juli - Des 2026) beserta Absensi Variatif 34 Siswa berhasil dibuat.`);

  // 9. Buat Data Penilaian Formatif & Sumatif
  // Bersihkan penilaian lama untuk kelas & mapel ini
  await prisma.penilaianKelas.deleteMany({
    where: { kelasId: kelas.id, mapelId: mapel.id },
  });

  const formatifData = [
    { nama: "Formatif 1 (TP 1)", tpCode: "TP-SEJ-01", date: "2026-08-06" },
    { nama: "Formatif 2 (TP 2)", tpCode: "TP-SEJ-02", date: "2026-08-27" },
    { nama: "Formatif 3 (TP 3)", tpCode: "TP-SEJ-03", date: "2026-09-17" },
    { nama: "Formatif 4 (TP 4)", tpCode: "TP-SEJ-04", date: "2026-09-24" },
    { nama: "Formatif 5 (TP 5)", tpCode: "TP-SEJ-05", date: "2026-10-22" },
    { nama: "Formatif 6 (TP 6)", tpCode: "TP-SEJ-06", date: "2026-11-19" },
  ];

  for (const fItem of formatifData) {
    const pk = await prisma.penilaianKelas.create({
      data: {
        kelasId: kelas.id,
        mapelId: mapel.id,
        guruId: guru.id,
        namaPenilaian: fItem.nama,
        jenisPenilaian: "FORMATIF",
        tpCode: fItem.tpCode,
        tanggal: new Date(fItem.date),
        deskripsi: `Penilaian Formatif ${fItem.tpCode}`,
      },
    });

    const nilaiList = students.map((s, idx) => {
      // Nilai variatif antara 75 - 95
      const baseGrade = 78 + ((idx * 3 + fItem.nama.length * 5) % 18);
      return {
        penilaianKelasId: pk.id,
        siswaId: s.id,
        nilai: Math.min(Math.max(baseGrade, 75), 98),
      };
    });

    await prisma.penilaianSiswa.createMany({
      data: nilaiList,
    });
  }

  const sumatifData = [
    { nama: "Sumatif Tengah Semester (STS)", tpCode: "STS", date: "2026-10-01" },
    { nama: "Sumatif Akhir Semester (SAS)", tpCode: "SAS", date: "2026-12-03" },
  ];

  for (const sItem of sumatifData) {
    const pk = await prisma.penilaianKelas.create({
      data: {
        kelasId: kelas.id,
        mapelId: mapel.id,
        guruId: guru.id,
        namaPenilaian: sItem.nama,
        jenisPenilaian: "SUMATIF",
        tpCode: sItem.tpCode,
        tanggal: new Date(sItem.date),
        deskripsi: sItem.nama,
      },
    });

    const nilaiList = students.map((s, idx) => {
      const baseGrade = 80 + ((idx * 7 + sItem.nama.length * 3) % 16);
      return {
        penilaianKelasId: pk.id,
        siswaId: s.id,
        nilai: Math.min(Math.max(baseGrade, 75), 96),
      };
    });

    await prisma.penilaianSiswa.createMany({
      data: nilaiList,
    });
  }

  console.log("✅ Data Penilaian Formatif (6 TP) dan Sumatif (STS & SAS) berhasil dibuat.");
  console.log("🎉 Seed Data Selesai! Login sebagai guru: ifdlol / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
