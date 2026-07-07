"use client";

import React, { useState, useRef, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  importUsersAction,
  importClassesAction,
  importStudentsAction,
  importViolationsAction,
  importRemissionsAction,
} from "@/app/actions/import";
import { X, FileSpreadsheet, Download, Upload, AlertCircle, RefreshCw } from "lucide-react";

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "users" | "classes" | "students" | "violations" | "remissions";
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function ImportExcelModal({
  isOpen,
  onClose,
  entityType,
  onSuccess,
  onError,
}: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const entityNames = {
    users: "Guru & Staff",
    classes: "Kelas",
    students: "Siswa",
    violations: "Jenis Pelanggaran",
    remissions: "Remisi Poin",
  };

  // Header dan Contoh Data untuk Template Excel
  const getTemplateConfig = () => {
    switch (entityType) {
      case "users":
        return {
          filename: "template_guru.xlsx",
          headers: [
            ["NIP", "Username", "Password", "Nama Lengkap", "Role (WAKA/BK/WALAS/GURU/OSIS)", "No WhatsApp"],
            ["198501012010121001", "budi_walas", "walas123", "Budi Harjo, S.Kom", "WALAS", "+628123456789"],
            ["199004052015012002", "ani_bk", "bk123", "Ani Lestari, S.Pd", "BK", "+628123456780"],
          ],
        };
      case "classes":
        return {
          filename: "template_kelas.xlsx",
          headers: [
            ["Nama Kelas", "Username Wali Kelas (Optional)", "Username Guru BK (Optional)"],
            ["XI RPL 3", "walas_rpl", "ani_bk"],
            ["X RPL 1", "", ""],
          ],
        };
      case "students":
        return {
          filename: "template_siswa.xlsx",
          headers: [
            ["NIS", "Nama Lengkap", "Nama Kelas"],
            ["10295", "Eka Saputra", "XI RPL 2"],
            ["10296", "Farhan Maulana", "XI RPL 2"],
          ],
        };
      case "violations":
        return {
          filename: "template_pelanggaran.xlsx",
          headers: [
            ["Nama Kategori", "Nama Pelanggaran", "Poin"],
            ["Kerapian", "Rambut melebihi daun telinga", "10"],
            ["Kedisiplinan", "Terlambat upacara bendera", "5"],
          ],
        };
      case "remissions":
        return {
          filename: "template_remisi.xlsx",
          headers: [
            ["Nama Remisi", "Persentase Pengurangan"],
            ["Bawa Pohon untuk Penghijauan", "15"],
            ["Kerja Bakti Sosial", "10"],
          ],
        };
    }
  };

  // 1. Ekspor Template Excel (Dynamic SheetJS)
  const handleDownloadTemplate = () => {
    const config = getTemplateConfig();
    const worksheet = XLSX.utils.aoa_to_sheet(config.headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, config.filename);
  };

  // 2. Baca File Excel dan Parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setErrorMsg(null);
    setPreviewData([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(fileExt || "")) {
      setErrorMsg("Format berkas tidak valid. Harap pilih berkas .xlsx, .xls, atau .csv.");
      setFile(null);
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "array" });
        const wsName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[wsName];
        
        // Membaca baris data (baris pertama adalah header)
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rawJson.length < 2) {
          setErrorMsg("Berkas kosong atau tidak memiliki baris data di bawah header.");
          return;
        }

        const headers = rawJson[0].map((h) => String(h).trim().toLowerCase());
        const dataRows = rawJson.slice(1);
        
        // Validasi Header Excel berdasarkan Entity Type
        const validateAndMap = validateHeadersAndMapRows(headers, dataRows);
        if (validateAndMap.error) {
          setErrorMsg(validateAndMap.error);
        } else {
          setPreviewData(validateAndMap.mappedRows || []);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Gagal membaca atau mem-parse file Excel. Periksa kembali struktur file Anda.");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Helper Pemetaan Header
  const validateHeadersAndMapRows = (headers: string[], dataRows: any[][]) => {
    const cleanRows = dataRows.filter((r) => r.length > 0 && r.some((val) => val !== null && val !== ""));

    if (entityType === "users") {
      const hasRoleHeader = headers.includes("role (waka/bk/walas/guru/osis)") || headers.includes("role (waka/bk/walas/guru)");
      const required = ["username", "nama lengkap"];
      const missing = required.filter((r) => !headers.includes(r));
      if (!hasRoleHeader) {
        missing.push("role (waka/bk/walas/guru/osis)");
      }
      if (missing.length > 0) {
        return { error: `Header Excel tidak sesuai. Kolom wajib yang kurang: ${missing.join(", ")}` };
      }

      const nipIdx = headers.indexOf("nip");
      const userIdx = headers.indexOf("username");
      const passIdx = headers.indexOf("password");
      const namaIdx = headers.indexOf("nama lengkap");
      
      let roleIdx = headers.indexOf("role (waka/bk/walas/guru/osis)");
      if (roleIdx === -1) {
        roleIdx = headers.indexOf("role (waka/bk/walas/guru)");
      }
      
      const waIdx = headers.indexOf("no whatsapp");

      const mappedRows = cleanRows.map((r) => ({
        nip: nipIdx !== -1 ? String(r[nipIdx] || "").trim() : undefined,
        username: String(r[userIdx] || "").trim(),
        password: passIdx !== -1 ? String(r[passIdx] || "").trim() : undefined,
        nama: String(r[namaIdx] || "").trim(),
        role: String(r[roleIdx] || "").trim(),
        whatsappNumber: waIdx !== -1 ? String(r[waIdx] || "").trim() : undefined,
      }));
      return { mappedRows };
    }

    if (entityType === "classes") {
      const required = ["nama kelas"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        return { error: `Header Excel tidak sesuai. Kolom wajib yang kurang: ${missing.join(", ")}` };
      }

      const namaIdx = headers.indexOf("nama kelas");
      const walasIdx = headers.indexOf("username wali kelas (optional)");
      const altWalasIdx = headers.indexOf("username wali kelas");
      const finalWalasIdx = walasIdx !== -1 ? walasIdx : altWalasIdx;

      const bkIdx = headers.indexOf("username guru bk (optional)");
      const altBkIdx = headers.indexOf("username guru bk");
      const finalBkIdx = bkIdx !== -1 ? bkIdx : altBkIdx;

      const mappedRows = cleanRows.map((r) => ({
        nama: String(r[namaIdx] || "").trim(),
        walasUsername: finalWalasIdx !== -1 ? String(r[finalWalasIdx] || "").trim() : undefined,
        bkUsername: finalBkIdx !== -1 ? String(r[finalBkIdx] || "").trim() : undefined,
      }));
      return { mappedRows };
    }

    if (entityType === "students") {
      const required = ["nis", "nama lengkap", "nama kelas"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        return { error: `Header Excel tidak sesuai. Kolom wajib yang kurang: ${missing.join(", ")}` };
      }

      const nisIdx = headers.indexOf("nis");
      const namaIdx = headers.indexOf("nama lengkap");
      const kelasIdx = headers.indexOf("nama kelas");

      const mappedRows = cleanRows.map((r) => ({
        nis: String(r[nisIdx] || "").trim(),
        nama: String(r[namaIdx] || "").trim(),
        kelasNama: String(r[kelasIdx] || "").trim(),
      }));
      return { mappedRows };
    }

    if (entityType === "violations") {
      const required = ["nama kategori", "nama pelanggaran", "poin"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        return { error: `Header Excel tidak sesuai. Kolom wajib yang kurang: ${missing.join(", ")}` };
      }

      const katIdx = headers.indexOf("nama kategori");
      const detIdx = headers.indexOf("nama pelanggaran");
      const poinIdx = headers.indexOf("poin");

      const mappedRows = cleanRows.map((r) => ({
        kategoriNama: String(r[katIdx] || "").trim(),
        pelanggaranNama: String(r[detIdx] || "").trim(),
        poin: Number(r[poinIdx]),
      }));
      return { mappedRows };
    }

    if (entityType === "remissions") {
      const required = ["nama remisi", "persentase pengurangan"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        return { error: `Header Excel tidak sesuai. Kolom wajib yang kurang: ${missing.join(", ")}` };
      }

      const namaIdx = headers.indexOf("nama remisi");
      const pctIdx = headers.indexOf("persentase pengurangan");

      const mappedRows = cleanRows.map((r) => ({
        nama: String(r[namaIdx] || "").trim(),
        persentasePengurangan: Number(r[pctIdx]),
      }));
      return { mappedRows };
    }

    return { error: "Entitas tidak dikenali." };
  };

  // 3. Memicu Proses Impor ke Database
  const handleImportSubmit = () => {
    if (previewData.length === 0) return;

    setErrorMsg(null);
    startTransition(async () => {
      let res;
      if (entityType === "users") {
        res = await importUsersAction(previewData);
      } else if (entityType === "classes") {
        res = await importClassesAction(previewData);
      } else if (entityType === "students") {
        res = await importStudentsAction(previewData);
      } else if (entityType === "violations") {
        res = await importViolationsAction(previewData);
      } else if (entityType === "remissions") {
        res = await importRemissionsAction(previewData);
      }

      if (res?.error) {
        setErrorMsg(res.error);
        onError(res.error);
      } else if (res?.success) {
        onSuccess(res.message || "Data berhasil diimpor!");
        handleClose();
      }
    });
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Impor Data {entityNames[entityType]}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Step 1: Download Template */}
          <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Langkah 1: Unduh Format Template
            </h4>
            <p className="text-xs text-slate-400">
              Gunakan format Excel standar kami untuk mencegah kesalahan penulisan kolom data.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg transition-all"
            >
              <Download className="w-4 h-4" />
              Unduh Template Excel (.xlsx)
            </button>
          </div>

          {/* Step 2: Upload File */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Langkah 2: Pilih File Spreadsheet
            </h4>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-500/40 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-950/20 hover:bg-slate-950/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-500 mb-1" />
              <span className="text-xs font-bold text-slate-300">
                {file ? file.name : "Klik untuk memilih berkas Excel"}
              </span>
              <span className="text-[10px] text-slate-500">Mendukung berkas format .xlsx, .xls, atau .csv</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Data Preview */}
          {previewData.length > 0 && !errorMsg && (
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Preview Data Terdeteksi
              </h4>
              <p className="text-xs text-emerald-400 font-medium">
                Ditemukan {previewData.length} baris data valid yang siap untuk diimpor.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            onClick={handleImportSubmit}
            disabled={previewData.length === 0 || isPending || !!errorMsg}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-emerald-950 rounded-xl text-sm font-bold-emerald-500/5 transition-all active:scale-98"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sedang Mengimpor...
              </>
            ) : (
              "Mulai Impor"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
