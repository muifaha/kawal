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
    dateStyle: "long"
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
    dateStyle: "long"
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

export function printJurnalMengajarPDF(jurnal: any, schoolSettings?: Record<string, string>) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const schoolName = schoolSettings?.school_name || "SMA NEGERI 6 TANGERANG";
  const schoolAddress = schoolSettings?.school_address || "Jl. Pt. YKK Mahkota, Pasir Jaya, Kec. Jatiuwung, Kota Tangerang, Banten 15135";

  const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(jurnal.tanggal));

  const ttdDateFormatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(jurnal.tanggal));

  // Parse photos if present
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

  // Attendance Status Map
  const statusLabels: Record<string, string> = {
    H: "Hadir",
    S: "Sakit",
    I: "Izin",
    A: "Alfa",
    D: "Dispensasi",
  };

  const absensiRowsHtml = (jurnal.absensi || []).map((att: any, idx: number) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="font-family: monospace; text-align: center;">${att.siswa?.nis || "-"}</td>
      <td>${att.siswa?.nama || "-"}</td>
      <td style="text-align: center; font-weight: bold;">${statusLabels[att.status] || att.status}</td>
    </tr>
  `).join('');

  const schoolLogo = schoolSettings?.school_logo || "/logo.png";
  const headerHtml = schoolSettings?.school_header
    ? `<div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; text-align: center;">
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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Jurnal Mengajar - ${jurnal.namaJurnal} - ${jurnal.kelas?.nama || ""}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 20mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            font-size: 10pt;
            line-height: 1.4;
            padding: 0;
            margin: 0;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px double #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .logo-img {
            width: 70px;
            height: auto;
          }
          .header-text {
            text-align: center;
            flex-grow: 1;
            padding: 0 10px;
          }
          .header-text h2 {
            margin: 0;
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header-text h3 {
            margin: 2px 0 0 0;
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header-text p {
            margin: 2px 0 0 0;
            font-size: 8pt;
            color: #333;
          }
          .doc-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 15px 0 20px 0;
            letter-spacing: 1px;
            text-decoration: underline;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .info-table td {
            padding: 4px 6px;
            vertical-align: top;
          }
          .info-table td.label {
            width: 130px;
            font-weight: bold;
            color: #333;
          }
          .info-table td.colon {
            width: 10px;
          }
          .box-section {
            border: 1px solid #333;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 15px;
            background-color: #fcfcfc;
          }
          .box-title {
            font-weight: bold;
            font-size: 9pt;
            text-transform: uppercase;
            color: #555;
            margin-bottom: 4px;
          }
          .box-content {
            font-size: 10pt;
            white-space: pre-wrap;
          }
          .absensi-title {
            font-weight: bold;
            font-size: 10pt;
            text-transform: uppercase;
            margin-top: 15px;
            margin-bottom: 8px;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table.data-table th, table.data-table td {
            border: 1px solid #444;
            padding: 5px 8px;
            font-size: 9.5pt;
          }
          table.data-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8.5pt;
          }
          .footer-section {
            margin-top: 30px;
            display: flex;
            justify-content: flex-end;
            page-break-inside: avoid;
          }
          .ttd-box {
            text-align: center;
            width: 260px;
          }
          .ttd-space {
            height: 65px;
          }
        </style>
      </head>
      <body>
        ${headerHtml}

        <div class="doc-title">JURNAL MENGAJAR</div>

        <table class="info-table">
          <tr>
            <td class="label">Nama Guru</td>
            <td class="colon">:</td>
            <td><strong>${jurnal.guru?.nama || "-"}</strong></td>
            <td class="label">Tanggal</td>
            <td class="colon">:</td>
            <td>${tanggalFormatted}</td>
          </tr>
          <tr>
            <td class="label">Kelas Target</td>
            <td class="colon">:</td>
            <td>Kelas ${jurnal.kelas?.nama || "-"}</td>
            <td class="label">Jam Pelajaran</td>
            <td class="colon">:</td>
            <td>Jam ke-${jurnal.jamMulai} - ${jurnal.jamSelesai}</td>
          </tr>
          <tr>
            <td class="label">Mata Pelajaran</td>
            <td class="colon">:</td>
            <td>${jurnal.mapel?.nama || "-"}</td>
            <td class="label">Nama Jurnal</td>
            <td class="colon">:</td>
            <td><strong>${jurnal.namaJurnal}</strong></td>
          </tr>
        </table>

        <div class="box-section">
          <div class="box-title">Deskripsi Pembelajaran</div>
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
            <div style="margin-top: 4px;">Guru Mata Pelajaran ${jurnal.mapel?.nama || ""}</div>
            <div class="ttd-space" style="display: flex; align-items: center; justify-content: center;">
              ${jurnal.guru?.ttd ? `<img src="${jurnal.guru.ttd}" style="max-height: 60px; max-width: 160px; object-fit: contain;" />` : ''}
            </div>
            <div style="font-weight: bold; text-decoration: underline;">${jurnal.guru?.nama || "-"}</div>
            <div>NIP. ${jurnal.guru?.nip || "...................................."}</div>
          </div>
        </div>

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

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
