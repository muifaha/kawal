export interface PrintSummonsData {
  id: string;
  nama: string;
  nis: string;
  kelas: string;
  points: number;
  thresholdPoints: number;
  level: number;
  bkNama?: string | null;
  bkNip?: string | null;
  type?: "POIN" | "ALFA";
  alphaCount?: number;
}

export function printSingleSummons(
  student: PrintSummonsData,
  hariTanggal?: string,
  waktu?: string,
  settings?: Record<string, string>,
  paperSize?: string
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const letterLevel = student.level === 1 ? "I" : student.level === 2 ? "II" : "III";
  const schoolName = settings?.school_name || "SMK NEGERI KAWAL";
  const schoolCity = settings?.school_city || "Kawal";
  const size = paperSize || settings?.print_paper_size || "A4";
  const pageSize = size === "F4" ? "215mm 330mm" : "A4";

  const headerHtml = settings?.school_header
    ? `<div class="header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 15px; text-align: center;">
        <img src="${settings.school_header}" style="width: 100%; height: auto; display: block;" />
       </div>`
    : `<div class="header">
        <h1>PEMERINTAH PROVINSI JAWA TIMUR</h1>
        <h1>DINAS PENDIDIKAN</h1>
        <h1>${schoolName.toUpperCase()}</h1>
        <p>Jl. Raya Kawal No. 123, Telp: (031) 123456, Email: info@smknkawal.sch.id</p>
       </div>`;

  const htmlContent = `
    <html>
      <head>
        <title>Surat Pemanggilan Orang Tua - ${student.nama}</title>
        <style>
          @page {
            size: ${pageSize};
            margin: 10mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000;
            margin: 0;
            padding: 0;
            line-height: 1.5;
          }
          .letter-page {
            padding: 0;
          }
          .header {
            text-align: center;
            border-bottom: 3px double #000;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 16pt;
            margin: 0;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 13pt;
            margin: 3px 0 0 0;
            text-transform: uppercase;
            font-weight: normal;
          }
          .header p {
            font-size: 9pt;
            margin: 3px 0 0 0;
            font-style: italic;
          }
          .letter-meta {
            margin-bottom: 15px;
            font-size: 12pt;
          }
          .letter-meta table {
            width: 100%;
          }
          .letter-meta td {
            vertical-align: top;
          }
          .content {
            font-size: 12pt;
            text-align: justify;
            margin-bottom: 10px;
          }
          .content p {
            text-indent: 40px;
            margin: 6px 0;
          }
          .details-table {
            margin: 10px auto;
            width: 80%;
            border-collapse: collapse;
          }
          .details-table td {
            padding: 4px 6px;
            font-size: 12pt;
          }
          .signature-section {
            margin-top: 25px;
            font-size: 12pt;
          }
          .signature-table {
            width: 100%;
          }
          .signature-table td {
            width: 50%;
            text-align: center;
            vertical-align: top;
          }
          .signature-space {
            height: 70px;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${headerHtml}

        <div class="letter-meta">
          <table>
            <tr>
              <td style="width: 15%;">Nomor</td>
              <td style="width: 3%;">:</td>
              <td style="width: 50%;">421.5 / BK / ${new Date().getFullYear()}</td>
              <td style="width: 32%; text-align: right;">${schoolCity}, ${formattedDate}</td>
            </tr>
            <tr>
              <td>Lampiran</td>
              <td>:</td>
              <td>-</td>
              <td></td>
            </tr>
            <tr>
              <td>Hal</td>
              <td>:</td>
              <td><strong>Undangan Pemanggilan Orang Tua (Panggilan ${letterLevel})</strong></td>
              <td></td>
            </tr>
          </table>
        </div>

        <div class="content">
          <p>Kepada Yth.</p>
          <p>Bapak / Ibu Orang Tua / Wali dari <strong>${student.nama}</strong></p>
          <p>di Tempat</p>

          <br/>
          <p>Dengan hormat,</p>
          <p>Sehubungan dengan perkembangan pembinaan & kedisiplinan putra/putri Bapak/Ibu di sekolah, dengan ini kami mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid dari:</p>

          <table style="width: 80%; margin: 15px auto; font-size: 12pt;">
            <tr>
              <td style="width: 30%;">Nama Siswa</td>
              <td style="width: 5%;">:</td>
              <td><strong>${student.nama}</strong></td>
            </tr>
            <tr>
              <td>NIS</td>
              <td>:</td>
              <td>${student.nis}</td>
            </tr>
            <tr>
              <td>Kelas</td>
              <td>:</td>
              <td>${student.kelas}</td>
            </tr>
             <tr>
               <td>${student.type === "ALFA" ? "Jumlah Ketidakhadiran (Alfa)" : "Akumulasi Poin"}</td>
               <td>:</td>
               <td><strong>${student.type === "ALFA" ? `${student.alphaCount} Kali Alfa` : `${student.points} Poin`}</strong> (Tingkat Peringatan ${letterLevel})</td>
             </tr>
          </table>

          <p>Untuk hadir berkoordinasi dengan Guru Bimbingan Konseling (BK) sekolah pada:</p>

          <table class="details-table">
            <tr>
              <td style="width: 30%;">Hari / Tanggal</td>
              <td style="width: 5%;">:</td>
              <td style="border-bottom: 1px dotted #000;">${hariTanggal || ".................................................."}</td>
            </tr>
            <tr>
              <td>Waktu</td>
              <td>:</td>
              <td style="border-bottom: 1px dotted #000;">${waktu || "........................ WIB s.d Selesai"}</td>
            </tr>
            <tr>
              <td>Tempat</td>
              <td>:</td>
              <td>Ruang Bimbingan Konseling (BK) ${schoolName}</td>
            </tr>
            <tr>
              <td>Agenda</td>
              <td>:</td>
              <td>Koordinasi Pembinaan & Penyusunan Surat Perjanjian Murid</td>
            </tr>
          </table>

          <p>Meningat pentingnya pertemuan ini demi kebaikan bersama dan pembinaan putra/putri Bapak/Ibu, kehadiran Bapak/Ibu sangat kami harapkan. Atas perhatian dan kerja samanya, kami sampaikan terima kasih.</p>
        </div>

        <div class="signature-section">
          <table class="signature-table">
            <tr>
              <td>
                Mengetahui,<br/>
                Waka Kesiswaan ${schoolName}
                <div class="signature-space"></div>
                <strong>${settings?.waka_name || "________________________"}</strong><br/>
                NIP. ${settings?.waka_nip || "........................................"}
              </td>
              <td>
                ${schoolCity}, ${formattedDate}<br/>
                Guru Bimbingan Konseling (BK)
                <div class="signature-space"></div>
                <strong>${student.bkNama || "________________________"}</strong><br/>
                NIP. ${student.bkNip || "........................................"}
              </td>
            </tr>
          </table>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function printBulkSummons(
  students: PrintSummonsData[],
  selectedIds: string[],
  hariTanggal?: string,
  waktu?: string,
  settings?: Record<string, string>,
  paperSize?: string
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const schoolName = settings?.school_name || "SMK NEGERI KAWAL";
  const schoolCity = settings?.school_city || "Kawal";
  const size = paperSize || settings?.print_paper_size || "A4";
  const pageSize = size === "F4" ? "215mm 330mm" : "A4";

  const headerHtml = settings?.school_header
    ? `<div class="header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 15px; text-align: center;">
        <img src="${settings.school_header}" style="width: 100%; height: auto; display: block;" />
       </div>`
    : `<div class="header">
        <h1>PEMERINTAH PROVINSI JAWA TIMUR</h1>
        <h1>DINAS PENDIDIKAN</h1>
        <h1>${schoolName.toUpperCase()}</h1>
        <p>Jl. Raya Kawal No. 123, Telp: (031) 123456, Email: info@smknkawal.sch.id</p>
       </div>`;

  const htmlContent = `
    <html>
      <head>
        <title>Cetak Massal Surat Pemanggilan Orang Tua</title>
        <style>
          @page {
            size: ${pageSize};
            margin: 10mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
             font-family: 'Times New Roman', Times, serif;
             color: #000;
             margin: 0;
             padding: 0;
             line-height: 1.5;
          }
          .letter-page {
            page-break-after: always;
          }
          .letter-page:last-child {
            page-break-after: avoid;
          }
          .header {
            text-align: center;
            border-bottom: 3px double #000;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 16pt;
            margin: 0;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 13pt;
            margin: 3px 0 0 0;
            text-transform: uppercase;
            font-weight: normal;
          }
          .header p {
            font-size: 9pt;
            margin: 3px 0 0 0;
            font-style: italic;
          }
          .letter-meta {
            margin-bottom: 15px;
            font-size: 12pt;
          }
          .letter-meta table {
            width: 100%;
          }
          .letter-meta td {
            vertical-align: top;
          }
          .content {
            font-size: 12pt;
            text-align: justify;
            margin-bottom: 10px;
          }
          .content p {
            text-indent: 40px;
            margin: 6px 0;
          }
          .details-table {
            margin: 10px auto;
            width: 80%;
            border-collapse: collapse;
          }
          .details-table td {
            padding: 4px 6px;
            font-size: 12pt;
          }
          .signature-section {
            margin-top: 25px;
            font-size: 12pt;
          }
          .signature-table {
            width: 100%;
          }
          .signature-table td {
            width: 50%;
            text-align: center;
            vertical-align: top;
          }
          .signature-space {
            height: 70px;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${students
          .filter((s) => selectedIds.includes(s.id))
          .map((student) => {
            const letterLevel = student.level === 1 ? "I" : student.level === 2 ? "II" : "III";
            return `
              <div class="letter-page">
                ${headerHtml}

                <div class="letter-meta">
                  <table>
                    <tr>
                      <td style="width: 15%;">Nomor</td>
                      <td style="width: 3%;">:</td>
                      <td style="width: 50%;">421.5 / BK / ${new Date().getFullYear()}</td>
                      <td style="width: 32%; text-align: right;">${schoolCity}, ${formattedDate}</td>
                    </tr>
                    <tr>
                      <td>Lampiran</td>
                      <td>:</td>
                      <td>-</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td>Hal</td>
                      <td>:</td>
                      <td><strong>Undangan Pemanggilan Orang Tua (Panggilan ${letterLevel})</strong></td>
                      <td></td>
                    </tr>
                  </table>
                </div>

                <div class="content">
                  <p>Kepada Yth.</p>
                  <p>Bapak / Ibu Orang Tua / Wali dari <strong>${student.nama}</strong></p>
                  <p>di Tempat</p>

                  <br/>
                  <p>Dengan hormat,</p>
                  <p>Sehubungan dengan perkembangan pembinaan & kedisiplinan putra/putri Bapak/Ibu di sekolah, dengan ini kami mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid dari:</p>

                  <table style="width: 80%; margin: 15px auto; font-size: 12pt;">
                    <tr>
                      <td style="width: 30%;">Nama Siswa</td>
                      <td style="width: 5%;">:</td>
                      <td><strong>${student.nama}</strong></td>
                    </tr>
                    <tr>
                      <td>NIS</td>
                      <td>:</td>
                      <td>${student.nis}</td>
                    </tr>
                    <tr>
                      <td>Kelas</td>
                      <td>:</td>
                      <td>${student.kelas}</td>
                    </tr>
                     <tr>
                       <td>${student.type === "ALFA" ? "Jumlah Ketidakhadiran (Alfa)" : "Akumulasi Poin"}</td>
                       <td>:</td>
                       <td><strong>${student.type === "ALFA" ? `${student.alphaCount} Kali Alfa` : `${student.points} Poin`}</strong> (Tingkat Peringatan ${letterLevel})</td>
                     </tr>
                  </table>

                  <p>Untuk hadir berkoordinasi dengan Guru Bimbingan Konseling (BK) sekolah pada:</p>

                  <table class="details-table">
                    <tr>
                      <td style="width: 30%;">Hari / Tanggal</td>
                      <td style="width: 5%;">:</td>
                      <td style="border-bottom: 1px dotted #000;">${hariTanggal || ".................................................."}</td>
                    </tr>
                    <tr>
                      <td>Waktu</td>
                      <td>:</td>
                      <td style="border-bottom: 1px dotted #000;">${waktu || "........................ WIB s.d Selesai"}</td>
                    </tr>
                    <tr>
                      <td>Tempat</td>
                      <td>:</td>
                      <td>Ruang Bimbingan Konseling (BK) ${schoolName}</td>
                    </tr>
                    <tr>
                      <td>Agenda</td>
                      <td>:</td>
                      <td>Koordinasi Pembinaan & Penyusunan Surat Perjanjian Murid</td>
                    </tr>
                  </table>

                  <p>Meningat pentingnya pertemuan ini demi kebaikan bersama dan pembinaan putra/putri Bapak/Ibu, kehadiran Bapak/Ibu sangat kami harapkan. Atas perhatian dan kerja samanya, kami sampaikan terima kasih.</p>
                </div>

                <div class="signature-section">
                  <table class="signature-table">
                    <tr>
                      <td>
                        Mengetahui,<br/>
                        Waka Kesiswaan ${schoolName}
                        <div class="signature-space"></div>
                        <strong>${settings?.waka_name || "________________________"}</strong><br/>
                        NIP. ${settings?.waka_nip || "........................................"}
                      </td>
                      <td>
                        ${schoolCity}, ${formattedDate}<br/>
                        Guru Bimbingan Konseling (BK)
                        <div class="signature-space"></div>
                        <strong>${student.bkNama || "________________________"}</strong><br/>
                        NIP. ${student.bkNip || "........................................"}
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            `;
          })
          .join("")}
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function generateSingleJurnalHtmlSection(jurnal: any, schoolSettings?: Record<string, string>): string {
  const schoolName = schoolSettings?.school_name || "SMA NEGERI 6 TANGERANG";
  const schoolAddress = schoolSettings?.school_address || "Jl. Pt. YKK Mahkota, Pasir Jaya, Kec. Jatiuwung, Kota Tangerang, Banten 15135";

  const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(jurnal.tanggal));

  const ttdDateFormatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(jurnal.tanggal));

  let photosHtml = "";
  if (jurnal.foto) {
    try {
      const urls = JSON.parse(jurnal.foto);
      const kets = jurnal.fotoKeterangan ? JSON.parse(jurnal.fotoKeterangan) : [];
      if (Array.isArray(urls) && urls.length > 0) {
        photosHtml = `
          <div style="margin-top: 15px; margin-bottom: 20px; page-break-inside: avoid;">
            <div style="font-weight: bold; font-size: 10pt; margin-bottom: 8px; text-transform: uppercase;">Foto & Dokumentasi Pembelajaran:</div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              ${urls.map((url: string, idx: number) => `
                <div style="border: 1px solid #ccc; padding: 4px; border-radius: 6px; text-align: center; width: 180px;">
                  <img src="${url}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;" />
                  ${kets[idx] ? `<div style="font-size: 8pt; color: #555; margin-top: 4px; font-style: italic;">${kets[idx]}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    } catch (e) {}
  }

  const statusBadges: Record<string, { label: string; bg: string; color: string; border: string }> = {
    H: { label: "Hadir", bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
    S: { label: "Sakit", bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
    I: { label: "Izin", bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
    A: { label: "Alfa", bg: "#ffe4e6", color: "#be123c", border: "#fecdd3" },
    D: { label: "Dispensasi", bg: "#f3e8ff", color: "#6b21a8", border: "#e9d5ff" },
  };

  const absensiRowsHtml = (jurnal.absensi || []).map((att: any, idx: number) => {
    const badge = statusBadges[att.status] || { label: att.status, bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
    return `
      <tr>
        <td style="text-align: center; color: #64748b; font-size: 8.5pt;">${idx + 1}</td>
        <td style="font-family: monospace; text-align: center; font-weight: 600; color: #334155;">${att.siswa?.nis || "-"}</td>
        <td style="font-weight: 500; color: #0f172a;">${att.siswa?.nama || "-"}</td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 8pt; background-color: ${badge.bg}; color: ${badge.color}; border: 1px solid ${badge.border};">
            ${badge.label}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const schoolLogo = schoolSettings?.school_logo || "/logo.png";
  const headerHtml = schoolSettings?.school_header
    ? `<div style="margin-bottom: 15px; text-align: center;">
        <img src="${schoolSettings.school_header}" style="width: 100%; max-height: 140px; object-fit: contain; display: block; margin: 0 auto;" />
       </div>`
    : `<div class="header-container">
        <img src="${schoolLogo}" class="logo-img" alt="Logo Sekolah" />
        <div class="header-text">
          <h2>PEMERINTAH PROVINSI BANTEN</h2>
          <h3>DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
          <h2>${schoolName}</h2>
          <p>${schoolAddress}</p>
        </div>
        <div style="width: 70px;"></div>
       </div>`;

  const isCustomActivity = !jurnal.jadwalId || jurnal.kelas?.nama === "KEGIATAN UMUM";
  const docTitle = isCustomActivity ? "DOKUMENTASI KEGIATAN GURU" : "JURNAL MENGAJAR";
  const displayKelas = isCustomActivity ? "Kegiatan Non-KBM" : `Kelas ${jurnal.kelas?.nama || "-"}`;
  const displayMapel = isCustomActivity ? "Agenda / Kegiatan Sekolah" : (jurnal.mapel?.nama || "-");
  const boxTitle = isCustomActivity ? "Deskripsi Kegiatan" : "Deskripsi Pembelajaran";
  const ttdRole = isCustomActivity ? "Guru Pelaksana Kegiatan" : `Guru Mata Pelajaran ${jurnal.mapel?.nama || ""}`;

  return `
    <div class="session-page-wrapper">
      ${headerHtml}

      <div class="doc-title-container">
        <div class="doc-title">${docTitle}</div>
      </div>

      <div class="info-card">
        <table class="info-table">
          <tr>
            <td class="label">Nama Guru</td>
            <td class="colon">:</td>
            <td><strong style="color: #0f172a;">${jurnal.guru?.nama || "-"}</strong></td>
            <td class="label">Tanggal</td>
            <td class="colon">:</td>
            <td>${tanggalFormatted}</td>
          </tr>
          <tr>
            <td class="label">Kategori / Kelas</td>
            <td class="colon">:</td>
            <td>${displayKelas}</td>
            <td class="label">Sesi / Jam</td>
            <td class="colon">:</td>
            <td>Jam ke-${jurnal.jamMulai}${jurnal.jamMulai !== jurnal.jamSelesai ? ` - ${jurnal.jamSelesai}` : ""}</td>
          </tr>
          <tr>
            <td class="label">Mata Pelajaran / Agenda</td>
            <td class="colon">:</td>
            <td>${displayMapel}</td>
            <td class="label">Nama Kegiatan</td>
            <td class="colon">:</td>
            <td><strong style="color: #1e3a8a;">${jurnal.namaJurnal}</strong></td>
          </tr>
        </table>
      </div>

      <div class="box-section">
        <div class="box-title">${boxTitle}</div>
        <div class="box-content">${jurnal.kegiatan}</div>
      </div>

      ${photosHtml}

      ${jurnal.absensi && jurnal.absensi.length > 0 ? `
        <div class="absensi-title">Daftar Kehadiran Siswa (Absensi Kelas):</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">No</th>
              <th style="width: 110px; text-align: center;">NIS</th>
              <th>Nama Lengkap Siswa</th>
              <th style="width: 100px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${absensiRowsHtml}
          </tbody>
        </table>
      ` : ''}

      <div class="footer-section">
        <div class="ttd-box">
          <div>Tangerang, ${ttdDateFormatted}</div>
          <div style="margin-top: 3px; font-weight: 600; color: #475569;">${ttdRole}</div>
          <div class="ttd-space" style="display: flex; align-items: center; justify-content: center;">
            ${jurnal.guru?.ttd ? `<img src="${jurnal.guru.ttd}" style="max-height: 60px; max-width: 160px; object-fit: contain;" />` : ''}
          </div>
          <div class="ttd-nama">${jurnal.guru?.nama || "-"}</div>
          <div style="font-size: 8.5pt; color: #475569;">NIP. ${jurnal.guru?.nip || "...................................."}</div>
        </div>
      </div>
    </div>
  `;
}

export function printJurnalMengajarPDF(jurnal: any, schoolSettings?: Record<string, string>) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const sectionHtml = generateSingleJurnalHtmlSection(jurnal, schoolSettings);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Jurnal Mengajar - ${jurnal.namaJurnal} - ${jurnal.kelas?.nama || ""}</title>
        <style>
          @page { size: A4; margin: 12mm 16mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 9.5pt; line-height: 1.4; padding: 0; margin: 0; background-color: #ffffff; }
          .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #1e3a8a; padding-bottom: 10px; margin-bottom: 15px; }
          .logo-img { width: 70px; height: auto; }
          .header-text { text-align: center; flex-grow: 1; padding: 0 10px; }
          .header-text h2 { margin: 0; font-size: 13pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; }
          .header-text h3 { margin: 2px 0 0 0; font-size: 10.5pt; font-weight: 700; color: #1e293b; text-transform: uppercase; }
          .header-text p { margin: 2px 0 0 0; font-size: 8pt; color: #475569; }
          .doc-title-container { text-align: center; margin: 14px 0 16px 0; }
          .doc-title { display: inline-block; font-size: 14pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1.5px; padding-bottom: 4px; border-bottom: 2.5px solid #2563eb; }
          .info-card { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table td { padding: 4px 6px; vertical-align: top; font-size: 9.5pt; }
          .info-table td.label { width: 120px; font-weight: 700; color: #1e3a8a; }
          .info-table td.colon { width: 10px; color: #64748b; }
          .box-section { border: 1px solid #cbd5e1; border-left: 4px solid #1e3a8a; border-radius: 6px; padding: 10px 14px; margin-bottom: 15px; background-color: #ffffff; }
          .box-title { font-weight: 800; font-size: 9.5pt; text-transform: uppercase; color: #1e3a8a; margin-bottom: 5px; letter-spacing: 0.5px; }
          .box-content { font-size: 9.5pt; color: #1e293b; line-height: 1.5; white-space: pre-wrap; }
          .absensi-title { font-weight: 800; font-size: 9.5pt; text-transform: uppercase; color: #1e3a8a; margin-top: 16px; margin-bottom: 8px; letter-spacing: 0.5px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; }
          table.data-table th { background-color: #1e3a8a; color: #ffffff; font-weight: 700; text-transform: uppercase; font-size: 8.5pt; padding: 7px 10px; border: 1px solid #1e3a8a; letter-spacing: 0.5px; }
          table.data-table td { border: 1px solid #e2e8f0; padding: 6px 10px; font-size: 9pt; color: #1e293b; }
          table.data-table tbody tr:nth-child(even) { background-color: #f8fafc; }
          .footer-section { margin-top: 25px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
          .ttd-box { text-align: center; width: 250px; font-size: 9.5pt; color: #1e293b; }
          .ttd-space { height: 65px; margin: 4px 0; }
          .ttd-nama { font-weight: bold; color: #000000; text-decoration: underline; }
        </style>
      </head>
      <body>
        ${sectionHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function printJurnalMengajarDailyPDF(
  journals: any[],
  dateLabel: string,
  schoolSettings?: Record<string, string>
) {
  if (!journals || journals.length === 0) return;

  const sortedJournals = sortJournalsByKelasAndJam(journals);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const allSectionsHtml = sortedJournals
    .map((jurnal) => generateSingleJurnalHtmlSection(jurnal, schoolSettings))
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Jurnal Kegiatan Harian - ${dateLabel}</title>
        <style>
          @page { size: A4; margin: 12mm 16mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 9.5pt; line-height: 1.4; padding: 0; margin: 0; background-color: #ffffff; }
          .session-page-wrapper { page-break-after: always; break-after: page; }
          .session-page-wrapper:last-child { page-break-after: avoid; break-after: avoid; }
          .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #1e3a8a; padding-bottom: 10px; margin-bottom: 15px; }
          .logo-img { width: 70px; height: auto; }
          .header-text { text-align: center; flex-grow: 1; padding: 0 10px; }
          .header-text h2 { margin: 0; font-size: 13pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; }
          .header-text h3 { margin: 2px 0 0 0; font-size: 10.5pt; font-weight: 700; color: #1e293b; text-transform: uppercase; }
          .header-text p { margin: 2px 0 0 0; font-size: 8pt; color: #475569; }
          .doc-title-container { text-align: center; margin: 14px 0 16px 0; }
          .doc-title { display: inline-block; font-size: 14pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1.5px; padding-bottom: 4px; border-bottom: 2.5px solid #2563eb; }
          .info-card { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table td { padding: 4px 6px; vertical-align: top; font-size: 9.5pt; }
          .info-table td.label { width: 120px; font-weight: 700; color: #1e3a8a; }
          .info-table td.colon { width: 10px; color: #64748b; }
          .box-section { border: 1px solid #cbd5e1; border-left: 4px solid #1e3a8a; border-radius: 6px; padding: 10px 14px; margin-bottom: 15px; background-color: #ffffff; }
          .box-title { font-weight: 800; font-size: 9.5pt; text-transform: uppercase; color: #1e3a8a; margin-bottom: 5px; letter-spacing: 0.5px; }
          .box-content { font-size: 9.5pt; color: #1e293b; line-height: 1.5; white-space: pre-wrap; }
          .absensi-title { font-weight: 800; font-size: 9.5pt; text-transform: uppercase; color: #1e3a8a; margin-top: 16px; margin-bottom: 8px; letter-spacing: 0.5px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; }
          table.data-table th { background-color: #1e3a8a; color: #ffffff; font-weight: 700; text-transform: uppercase; font-size: 8.5pt; padding: 7px 10px; border: 1px solid #1e3a8a; letter-spacing: 0.5px; }
          table.data-table td { border: 1px solid #e2e8f0; padding: 6px 10px; font-size: 9pt; color: #1e293b; }
          table.data-table tbody tr:nth-child(even) { background-color: #f8fafc; }
          .footer-section { margin-top: 25px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
          .ttd-box { text-align: center; width: 250px; font-size: 9.5pt; color: #1e293b; }
          .ttd-space { height: 65px; margin: 4px 0; }
          .ttd-nama { font-weight: bold; color: #000000; text-decoration: underline; }
        </style>
      </head>
      <body>
        ${allSectionsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function parseKelasSortOrder(kelasNama: string): { grade: number; sub: string } {
  if (!kelasNama) return { grade: 99, sub: "" };
  const clean = kelasNama.trim().replace(/^Kelas\s+/i, "");

  let grade = 99;
  let sub = clean;

  if (/^XII\b/i.test(clean)) {
    grade = 3;
    sub = clean.replace(/^XII\s*/i, "");
  } else if (/^XI\b/i.test(clean)) {
    grade = 2;
    sub = clean.replace(/^XI\s*/i, "");
  } else if (/^X\b/i.test(clean)) {
    grade = 1;
    sub = clean.replace(/^X\s*/i, "");
  }

  return { grade, sub };
}

export function sortJournalsByKelasAndJam(journals: any[]): any[] {
  return [...journals].sort((a, b) => {
    const classA = parseKelasSortOrder(a.kelas?.nama || "");
    const classB = parseKelasSortOrder(b.kelas?.nama || "");

    if (classA.grade !== classB.grade) {
      return classA.grade - classB.grade;
    }

    const subComp = classA.sub.localeCompare(classB.sub, undefined, { numeric: true, sensitivity: 'base' });
    if (subComp !== 0) return subComp;

    const jamMulaiA = Number(a.jamMulai) || 0;
    const jamMulaiB = Number(b.jamMulai) || 0;
    if (jamMulaiA !== jamMulaiB) {
      return jamMulaiA - jamMulaiB;
    }

    const jamSelesaiA = Number(a.jamSelesai) || 0;
    const jamSelesaiB = Number(b.jamSelesai) || 0;
    return jamSelesaiA - jamSelesaiB;
  });
}

export function sortClassesByGrade(classes: any[]): any[] {
  return [...classes].sort((a, b) => {
    const classA = parseKelasSortOrder(a.nama || "");
    const classB = parseKelasSortOrder(b.nama || "");

    if (classA.grade !== classB.grade) {
      return classA.grade - classB.grade;
    }
    return classA.sub.localeCompare(classB.sub, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export async function exportKehadiranJurnalExcelMatrix(
  matrixData: {
    dateStr: string;
    dayTipe: string;
    classes: any[];
    schedules: any[];
    journals: any[];
    schoolSettings: Record<string, string>;
  },
  dateLabel: string
) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Kehadiran Jurnal", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const schoolName = matrixData.schoolSettings?.school_name || "SMA NEGERI 6 TANGERANG";

  // 1. Title Block
  worksheet.mergeCells("A1:K1");
  const cTitle1 = worksheet.getCell("A1");
  cTitle1.value = "REKAPITULASI KEHADIRAN SISWA PER KELAS (JURNAL MENGAJAR HARIAN)";
  cTitle1.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF1E3A8A" } };
  cTitle1.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A2:K2");
  const cTitle2 = worksheet.getCell("A2");
  cTitle2.value = schoolName.toUpperCase();
  cTitle2.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F172A" } };
  cTitle2.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A3:K3");
  const cTitle3 = worksheet.getCell("A3");
  cTitle3.value = `Hari, Tanggal: ${dateLabel}`;
  cTitle3.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
  cTitle3.alignment = { horizontal: "center", vertical: "middle" };

  let currentWorkingRow = 5;

  const statusStyles: Record<string, { label: string; bg: string; fg: string }> = {
    H: { label: "H", bg: "FFDCFCE7", fg: "FF15803D" }, // Hadir
    S: { label: "S", bg: "FFFDE68A", fg: "FFB45309" }, // Sakit
    I: { label: "I", bg: "FFDBEAFE", fg: "FF1D4ED8" }, // Izin
    A: { label: "A", bg: "FFFFCDD3", fg: "FFBE123C" }, // Alfa
    D: { label: "D", bg: "FFE9D5FF", fg: "FF6B21A8" }, // Dispensasi
    "-": { label: "-", bg: "FFF1F5F9", fg: "FF94A3B8" }, // Belum diisi guru
  };

  const sortedClasses = sortClassesByGrade(matrixData.classes);

  sortedClasses.forEach((kelasItem) => {
    const classSchedules = matrixData.schedules.filter((s) => s.kelasId === kelasItem.id);
    const classJournals = matrixData.journals.filter((j) => j.kelasId === kelasItem.id);

    if (classSchedules.length === 0 && classJournals.length === 0) return;

    // Collect all session slots
    const sessionMap = new Map<string, { jamMulai: number; jamSelesai: number; label: string; journal: any; schedule: any }>();

    classSchedules.forEach((sched) => {
      const key = `${sched.jamMulai}-${sched.jamSelesai}`;
      if (!sessionMap.has(key)) {
        const matchingJournal = classJournals.find(
          (j) => j.jamMulai === sched.jamMulai || (j.jadwalId && j.jadwalId === sched.id)
        );
        sessionMap.set(key, {
          jamMulai: sched.jamMulai,
          jamSelesai: sched.jamSelesai,
          label: `Jam ${sched.jamMulai}-${sched.jamSelesai}`,
          journal: matchingJournal || null,
          schedule: sched,
        });
      }
    });

    classJournals.forEach((j) => {
      const key = `${j.jamMulai}-${j.jamSelesai}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
          label: `Jam ${j.jamMulai}-${j.jamSelesai}`,
          journal: j,
          schedule: null,
        });
      }
    });

    const sessionsList = Array.from(sessionMap.values()).sort((a, b) => a.jamMulai - b.jamMulai);

    // Active students in class
    const students = (kelasItem.siswaKelas || [])
      .map((sk: any) => sk.siswa)
      .filter(Boolean)
      .filter((s: any) => s.status !== "LULUS" && s.status !== "PINDAH")
      .sort((a: any, b: any) => a.nama.localeCompare(b.nama));

    if (students.length === 0 && sessionsList.length === 0) return;

    const cleanKelasNama = kelasItem.nama.replace(/^Kelas\s+/i, "");

    // RENDER HEADER ROW
    const headers = ["Kelas", "NIS", "Nama Siswa", ...sessionsList.map((s) => s.label)];
    const hRow = worksheet.getRow(currentWorkingRow);
    hRow.values = headers;
    hRow.height = 24;

    hRow.eachCell({ includeEmpty: false }, (cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1E3A8A" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } },
      };
    });

    currentWorkingRow++;
    const firstStudentRow = currentWorkingRow;

    // RENDER STUDENT ROWS
    students.forEach((student: any) => {
      const rowValues: any[] = [cleanKelasNama, student.nis || student.nisn || "-", student.nama];

      sessionsList.forEach((sess) => {
        if (!sess.journal) {
          // Guru belum mengisi -> '-'
          rowValues.push("-");
        } else {
          const att = (sess.journal.absensi || []).find((a: any) => a.siswaId === student.id);
          if (att) {
            rowValues.push(att.status || "H");
          } else {
            rowValues.push("H");
          }
        }
      });

      const sRow = worksheet.getRow(currentWorkingRow);
      sRow.values = rowValues;
      sRow.height = 19;

      sRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
        cell.font = { name: "Arial", size: 9, color: { argb: "FF0F172A" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if (colNum === 1 || colNum === 2) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNum === 3) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else {
          // Session columns
          const stVal = String(cell.value || "-").toUpperCase();
          const stStyle = statusStyles[stVal] || statusStyles["-"];

          cell.value = stStyle.label;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stStyle.bg } };
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: stStyle.fg } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });

      currentWorkingRow++;
    });

    const lastStudentRow = currentWorkingRow - 1;

    if (students.length > 1 && lastStudentRow >= firstStudentRow) {
      try {
        worksheet.mergeCells(`A${firstStudentRow}:A${lastStudentRow}`);
        const mergedCell = worksheet.getCell(`A${firstStudentRow}`);
        mergedCell.alignment = { horizontal: "center", vertical: "middle" };
      } catch (e) {}
    }

    currentWorkingRow++;

    // RENDER KETERANGAN LEGEND TABLE FOR THIS CLASS
    const ketHeaderRow = worksheet.getRow(currentWorkingRow);
    ketHeaderRow.values = ["Keterangan Sesi Pembelajaran Kelas " + cleanKelasNama];
    try {
      worksheet.mergeCells(`A${currentWorkingRow}:D${currentWorkingRow}`);
    } catch (e) {}
    const ketTitleCell = worksheet.getCell(`A${currentWorkingRow}`);
    ketTitleCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF1E3A8A" } };
    currentWorkingRow++;

    const ketSubHeaderRow = worksheet.getRow(currentWorkingRow);
    ketSubHeaderRow.values = ["Waktu / Sesi", "Mata Pelajaran", "Guru Pengajar", "Status Jurnal"];
    ketSubHeaderRow.height = 20;

    [1, 2, 3, 4].forEach((colIdx) => {
      const cell = ketSubHeaderRow.getCell(colIdx);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
      cell.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "thin", color: { argb: "FF334155" } },
        left: { style: "thin", color: { argb: "FF475569" } },
        right: { style: "thin", color: { argb: "FF475569" } },
      };
    });

    currentWorkingRow++;

    sessionsList.forEach((sess) => {
      const mapelNama = sess.journal?.mapel?.nama || sess.schedule?.mapel?.nama || "-";
      const guruNama = sess.journal?.guru?.nama || sess.schedule?.guru?.nama || "-";
      const statusKet = sess.journal ? "Sudah Diisi" : "Belum Diisi";

      const r = worksheet.getRow(currentWorkingRow);
      r.values = [sess.label, mapelNama, guruNama, statusKet];
      r.height = 18;

      [1, 2, 3, 4].forEach((colIdx) => {
        const cell = r.getCell(colIdx);
        cell.font = { name: "Arial", size: 8.5, color: { argb: "FF0F172A" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if (colIdx === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
        else if (colIdx === 4) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { name: "Arial", size: 8.5, bold: true, color: { argb: sess.journal ? "FF15803D" : "FFBE123C" } };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
      });

      currentWorkingRow++;
    });

    currentWorkingRow += 2; // Blank spacing
  });

  // FOOTER SIGNATURES
  worksheet.addRow([]);
  const ttdDateFormatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const rTtd1 = worksheet.addRow(["", "", "Tangerang, " + ttdDateFormatted]);
  rTtd1.getCell(3).font = { name: "Arial", size: 10 };

  const rTtd2 = worksheet.addRow(["", "", "Mengetahui,"]);
  rTtd2.getCell(3).font = { name: "Arial", size: 10, bold: true };

  const rTtd3 = worksheet.addRow(["", "", "Waka Kurikulum"]);
  rTtd3.getCell(3).font = { name: "Arial", size: 10, bold: true };

  worksheet.addRow([]);
  worksheet.addRow([]);

  const rTtd4 = worksheet.addRow(["", "", "CHRESTIAN PRASETIO H, S.E, MM."]);
  rTtd4.getCell(3).font = { name: "Arial", size: 10, bold: true, underline: true };

  const rTtd5 = worksheet.addRow(["", "", "NIP. 197108152008011007"]);
  rTtd5.getCell(3).font = { name: "Arial", size: 9, color: { argb: "FF475569" } };

  // Set explicit column widths
  worksheet.getColumn(1).width = 12; // Kelas
  worksheet.getColumn(2).width = 16; // NIS
  worksheet.getColumn(3).width = 30; // Nama Siswa
  for (let c = 4; c <= 15; c++) {
    worksheet.getColumn(c).width = 14;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Matriks_Kehadiran_Jurnal_${dateLabel.replace(/\s+/g, "_")}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
