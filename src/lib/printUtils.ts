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
    timeZone: "Asia/Jakarta",
  }).format(new Date(jurnal.tanggal));

  const ttdDateFormatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
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

  // Attendance Status Badge Map
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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Jurnal Mengajar - ${jurnal.namaJurnal} - ${jurnal.kelas?.nama || ""}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm 16mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            font-size: 9.5pt;
            line-height: 1.4;
            padding: 0;
            margin: 0;
            background-color: #ffffff;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px double #1e3a8a;
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
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
          }
          .header-text h3 {
            margin: 2px 0 0 0;
            font-size: 10.5pt;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
          }
          .header-text p {
            margin: 2px 0 0 0;
            font-size: 8pt;
            color: #475569;
          }
          .doc-title-container {
            text-align: center;
            margin: 14px 0 16px 0;
          }
          .doc-title {
            display: inline-block;
            font-size: 14pt;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            padding-bottom: 4px;
            border-bottom: 2.5px solid #2563eb;
          }
          .info-card {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 15px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 4px 6px;
            vertical-align: top;
            font-size: 9.5pt;
          }
          .info-table td.label {
            width: 120px;
            font-weight: 700;
            color: #1e3a8a;
          }
          .info-table td.colon {
            width: 10px;
            color: #64748b;
          }
          .box-section {
            border: 1px solid #cbd5e1;
            border-left: 4px solid #1e3a8a;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 15px;
            background-color: #ffffff;
          }
          .box-title {
            font-weight: 800;
            font-size: 9.5pt;
            text-transform: uppercase;
            color: #1e3a8a;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }
          .box-content {
            font-size: 9.5pt;
            color: #1e293b;
            line-height: 1.5;
            white-space: pre-wrap;
          }
          .absensi-title {
            font-weight: 800;
            font-size: 9.5pt;
            text-transform: uppercase;
            color: #1e3a8a;
            margin-top: 16px;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #cbd5e1;
          }
          table.data-table th {
            background-color: #1e3a8a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 8.5pt;
            padding: 7px 10px;
            border: 1px solid #1e3a8a;
            letter-spacing: 0.5px;
          }
          table.data-table td {
            border: 1px solid #e2e8f0;
            padding: 6px 10px;
            font-size: 9pt;
            color: #1e293b;
          }
          table.data-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer-section {
            margin-top: 25px;
            display: flex;
            justify-content: flex-end;
            page-break-inside: avoid;
          }
          .ttd-box {
            text-align: center;
            width: 250px;
            font-size: 9.5pt;
            color: #1e293b;
          }
          .ttd-space {
            height: 65px;
            margin: 4px 0;
          }
          .ttd-nama {
            font-weight: bold;
            color: #000000;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        ${headerHtml}

        <div class="doc-title-container">
          <div class="doc-title">JURNAL MENGAJAR</div>
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
              <td class="label">Kelas</td>
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
              <td><strong style="color: #1e3a8a;">${jurnal.namaJurnal}</strong></td>
            </tr>
          </table>
        </div>

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
            <div style="margin-top: 3px; font-weight: 600; color: #475569;">Guru Mata Pelajaran ${jurnal.mapel?.nama || ""}</div>
            <div class="ttd-space" style="display: flex; align-items: center; justify-content: center;">
              ${jurnal.guru?.ttd ? `<img src="${jurnal.guru.ttd}" style="max-height: 60px; max-width: 160px; object-fit: contain;" />` : ''}
            </div>
            <div class="ttd-nama">${jurnal.guru?.nama || "-"}</div>
            <div style="font-size: 8.5pt; color: #475569;">NIP. ${jurnal.guru?.nip || "...................................."}</div>
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

export function printJurnalMengajarDailyPDF(
  journals: any[],
  dateLabel: string,
  schoolSettings?: Record<string, string>
) {
  if (!journals || journals.length === 0) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const firstJournal = journals[0];
  const schoolName = schoolSettings?.school_name || "SMA NEGERI 6 TANGERANG";
  const schoolAddress = schoolSettings?.school_address || "Jl. Pt. YKK Mahkota, Pasir Jaya, Kec. Jatiuwung, Kota Tangerang, Banten 15135";

  const ttdDateFormatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(firstJournal.tanggal));

  const statusBadges: Record<string, { label: string; bg: string; color: string; border: string }> = {
    H: { label: "Hadir", bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
    S: { label: "Sakit", bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
    I: { label: "Izin", bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
    A: { label: "Alfa", bg: "#ffe4e6", color: "#be123c", border: "#fecdd3" },
    D: { label: "Dispensasi", bg: "#f3e8ff", color: "#6b21a8", border: "#e9d5ff" },
  };

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

  const journalEntriesHtml = journals.map((jurnal, index) => {
    let photosHtml = "";
    if (jurnal.foto) {
      try {
        const urls = JSON.parse(jurnal.foto);
        const kets = jurnal.fotoKeterangan ? JSON.parse(jurnal.fotoKeterangan) : [];
        if (Array.isArray(urls) && urls.length > 0) {
          photosHtml = `
            <div style="margin-top: 10px; margin-bottom: 12px; page-break-inside: avoid;">
              <div style="font-weight: 800; font-size: 8.5pt; color: #1e3a8a; margin-bottom: 6px; text-transform: uppercase;">Foto Dokumentasi:</div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${urls.map((url: string, idx: number) => `
                  <div style="border: 1px solid #cbd5e1; padding: 4px; border-radius: 6px; text-align: center; width: 150px; background: #f8fafc;">
                    <img src="${url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px;" />
                    ${kets[idx] ? `<div style="font-size: 7.5pt; color: #475569; margin-top: 3px; font-style: italic;">${kets[idx]}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      } catch (e) {}
    }

    const absensiRowsHtml = (jurnal.absensi || []).map((att: any, idx: number) => {
      const badge = statusBadges[att.status] || { label: att.status, bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
      return `
        <tr>
          <td style="text-align: center; color: #64748b; font-size: 8pt;">${idx + 1}</td>
          <td style="font-family: monospace; text-align: center; font-weight: 600; color: #334155;">${att.siswa?.nis || "-"}</td>
          <td style="font-weight: 500; color: #0f172a;">${att.siswa?.nama || "-"}</td>
          <td style="text-align: center;">
            <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 7.5pt; background-color: ${badge.bg}; color: ${badge.color}; border: 1px solid ${badge.border};">
              ${badge.label}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="margin-bottom: 22px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff;">
        <div style="background: #1e3a8a; color: #ffffff; padding: 8px 12px; font-weight: 800; font-size: 9.5pt; display: flex; justify-content: space-between; align-items: center;">
          <span>Sesi #${index + 1}: ${jurnal.namaJurnal}</span>
          <span style="font-size: 8.5pt; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">
            Kelas ${jurnal.kelas?.nama || "-"} | Jam Ke-${jurnal.jamMulai} - ${jurnal.jamSelesai}
          </span>
        </div>

        <div style="padding: 12px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9pt;">
            <tr>
              <td style="width: 110px; font-weight: 700; color: #1e3a8a;">Mata Pelajaran</td>
              <td style="width: 10px; color: #64748b;">:</td>
              <td>${jurnal.mapel?.nama || "-"}</td>
              <td style="width: 110px; font-weight: 700; color: #1e3a8a;">Nama Guru</td>
              <td style="width: 10px; color: #64748b;">:</td>
              <td><strong>${jurnal.guru?.nama || "-"}</strong></td>
            </tr>
          </table>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #2563eb; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 8.5pt; color: #1e3a8a; text-transform: uppercase; margin-bottom: 3px;">Deskripsi Pembelajaran:</div>
            <div style="font-size: 9pt; color: #1e293b; white-space: pre-wrap; line-height: 1.4;">${jurnal.kegiatan}</div>
          </div>

          ${photosHtml}

          ${jurnal.absensi && jurnal.absensi.length > 0 ? `
            <div style="font-weight: 800; font-size: 8.5pt; color: #1e3a8a; text-transform: uppercase; margin-top: 10px; margin-bottom: 6px;">
              Daftar Absensi Siswa:
            </div>
            <table class="data-table" style="margin-bottom: 0;">
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">No</th>
                  <th style="width: 100px; text-align: center;">NIS</th>
                  <th>Nama Lengkap Siswa</th>
                  <th style="width: 90px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${absensiRowsHtml}
              </tbody>
            </table>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Rekap Jurnal Mengajar Harian - ${dateLabel}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm 16mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            font-size: 9.5pt;
            line-height: 1.4;
            padding: 0;
            margin: 0;
            background-color: #ffffff;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px double #1e3a8a;
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
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
          }
          .header-text h3 {
            margin: 2px 0 0 0;
            font-size: 10.5pt;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
          }
          .header-text p {
            margin: 2px 0 0 0;
            font-size: 8pt;
            color: #475569;
          }
          .doc-title-container {
            text-align: center;
            margin: 14px 0 16px 0;
          }
          .doc-title {
            display: inline-block;
            font-size: 13pt;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding-bottom: 3px;
            border-bottom: 2.5px solid #2563eb;
          }
          .doc-subtitle {
            font-size: 9.5pt;
            color: #475569;
            font-weight: 600;
            margin-top: 4px;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #cbd5e1;
          }
          table.data-table th {
            background-color: #1e3a8a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 8pt;
            padding: 6px 8px;
            border: 1px solid #1e3a8a;
          }
          table.data-table td {
            border: 1px solid #e2e8f0;
            padding: 5px 8px;
            font-size: 8.5pt;
            color: #1e293b;
          }
          table.data-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer-section {
            margin-top: 25px;
            display: flex;
            justify-content: flex-end;
            page-break-inside: avoid;
          }
          .ttd-box {
            text-align: center;
            width: 250px;
            font-size: 9.5pt;
            color: #1e293b;
          }
          .ttd-space {
            height: 60px;
            margin: 4px 0;
          }
          .ttd-nama {
            font-weight: bold;
            color: #000000;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        ${headerHtml}

        <div class="doc-title-container">
          <div class="doc-title">REKAP JURNAL MENGAJAR HARIAN</div>
          <div class="doc-subtitle">Tanggal: ${dateLabel} | Total Sesi: ${journals.length} Kegiatan</div>
        </div>

        ${journalEntriesHtml}

        <div class="footer-section">
          <div class="ttd-box">
            <div>Tangerang, ${ttdDateFormatted}</div>
            <div style="margin-top: 3px; font-weight: 600; color: #475569;">Guru Pengajar</div>
            <div class="ttd-space" style="display: flex; align-items: center; justify-content: center;">
              ${firstJournal.guru?.ttd ? `<img src="${firstJournal.guru.ttd}" style="max-height: 60px; max-width: 160px; object-fit: contain;" />` : ''}
            </div>
            <div class="ttd-nama">${firstJournal.guru?.nama || "-"}</div>
            <div style="font-size: 8.5pt; color: #475569;">NIP. ${firstJournal.guru?.nip || "...................................."}</div>
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
