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
              <td>Akumulasi Poin</td>
              <td>:</td>
              <td><strong>${student.points} Poin</strong> (Tingkat Peringatan ${letterLevel})</td>
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
                      <td>Akumulasi Poin</td>
                      <td>:</td>
                      <td><strong>${student.points} Poin</strong> (Tingkat Peringatan ${letterLevel})</td>
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
