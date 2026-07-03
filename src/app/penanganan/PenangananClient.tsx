"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { savePenangananAction } from "@/app/actions/penanganan";
import { Search, Calendar, FileText, CheckCircle, AlertCircle, Upload, X, Eye, ShieldAlert, BookOpen } from "lucide-react";

interface UserInfo {
  id: string;
  nama: string;
  role: string;
}

interface StudentViolation {
  id: string;
  nama: string;
  kategori: string;
  poin: number;
  tanggal: string;
}

interface StudentWarning {
  id: string;
  level: number;
  thresholdPoints: number;
  tanggal: string;
}

interface StudentOption {
  id: string;
  nis: string;
  nama: string;
  kelasNama: string;
  points: number;
  violations: StudentViolation[];
  activeWarnings: StudentWarning[];
}

interface PenangananLog {
  id: string;
  siswaNama: string;
  siswaNis: string;
  kelasNama: string;
  kasus: string;
  solusi: string;
  bukti: string[];
  petugasNama: string;
  tanggal: string;
}

interface PenangananClientProps {
  user: UserInfo;
  students: StudentOption[];
  initialLogs: PenangananLog[];
  classes: string[];
}

export default function PenangananClient({ user, students, initialLogs, classes }: PenangananClientProps) {
  const [logs, setLogs] = useState<PenangananLog[]>(initialLogs);
  
  // States for Form Input
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [kasus, setKasus] = useState("");
  const [solusi, setSolusi] = useState("");
  const [selectedSummonsId, setSelectedSummonsId] = useState<string>("");
  const [thresholdPoints, setThresholdPoints] = useState<number | null>(null);
  
  // Read query params for automatic prefill
  const searchParams = useSearchParams();
  const queryStudentId = searchParams.get("studentId");
  const queryThresholdPoints = searchParams.get("thresholdPoints");

  useEffect(() => {
    if (queryStudentId && students.length > 0) {
      const student = students.find((s) => s.id === queryStudentId);
      if (student) {
        setSelectedStudent(student);
        setStudentSearch(`${student.nama} (${student.kelasNama})`);
        
        if (queryThresholdPoints) {
          const thresholdVal = parseInt(queryThresholdPoints, 10);
          setThresholdPoints(thresholdVal);
          const warning = student.activeWarnings.find((w) => w.thresholdPoints === thresholdVal);
          if (warning) {
            setSelectedSummonsId(warning.id);
            setKasus(`Menangani Surat Panggilan Orang Tua / Peringatan Tingkat ${warning.level === 3 ? "III" : warning.level === 2 ? "II" : "I"} (Akumulasi Poin ${warning.thresholdPoints})`);
          } else {
            setSelectedSummonsId("");
            setKasus(`Menangani Surat Panggilan Orang Tua / Peringatan (Akumulasi Poin ${thresholdVal})`);
          }
        }
      }
    }
  }, [queryStudentId, queryThresholdPoints, students]);
  
  // File upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Logs filtering
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logSelectedClass, setLogSelectedClass] = useState("");

  // Transition & Alert states
  const [isPending, startTransition] = useTransition();
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const isBK = user.role === "BK";

  // Filter students for autocomplete dropdown
  const filteredStudents = students.filter((s) => {
    const query = studentSearch.toLowerCase();
    return s.nama.toLowerCase().includes(query) || s.nis.includes(query) || s.kelasNama.toLowerCase().includes(query);
  });

  // Handle student selection
  const handleSelectStudent = (student: StudentOption) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.nama} (${student.kelasNama})`);
    setShowStudentDropdown(false);
    setSelectedSummonsId("");
    setThresholdPoints(null);
    setKasus("");
  };

  // Helper to handle auto-fill when selecting violation/warning
  const handleCaseSelection = (value: string) => {
    if (value === "kustom") {
      setSelectedSummonsId("");
      setThresholdPoints(null);
      setKasus("");
    } else if (value.startsWith("summons:")) {
      const [_, id, level, thresholdPointsStr] = value.split(":");
      setSelectedSummonsId(id);
      setThresholdPoints(parseInt(thresholdPointsStr, 10));
      setKasus(`Menangani Surat Panggilan Orang Tua / Peringatan Tingkat ${level === "3" ? "III" : level === "2" ? "II" : "I"} (Akumulasi Poin ${thresholdPointsStr})`);
    } else if (value.startsWith("violation:")) {
      const [_, id, kategori, nama, poin] = value.split(":");
      setSelectedSummonsId("");
      setThresholdPoints(null);
      setKasus(`Menangani kasus pelanggaran: ${kategori} - ${nama} (+${poin} Poin)`);
    }
  };

  // Handle files selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  // Remove file from select queue
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudent || !kasus || !solusi) {
      setAlert({ type: "error", message: "Semua data wajib diisi." });
      return;
    }

    setAlert(null);
    const formData = new FormData();
    formData.append("siswaId", selectedStudent.id);
    formData.append("kasus", kasus);
    formData.append("solusi", solusi);
    if (selectedSummonsId) {
      formData.append("summonsId", selectedSummonsId);
    }
    if (thresholdPoints !== null) {
      formData.append("thresholdPoints", String(thresholdPoints));
    }
    
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    startTransition(async () => {
      const res = await savePenangananAction(formData);
      if (res.error) {
        setAlert({ type: "error", message: res.error });
      } else {
        setAlert({ type: "success", message: res.message || "Data penanganan berhasil disimpan!" });
        
        // Append log locally for instant UI update
        const newLog: PenangananLog = {
          id: Date.now().toString(),
          siswaNama: selectedStudent.nama,
          siswaNis: selectedStudent.nis,
          kelasNama: selectedStudent.kelasNama,
          kasus,
          solusi,
          bukti: selectedFiles.map((f) => `/uploads/${Date.now()}_${f.name.replace(/\s+/g, "_")}`), // Mock paths for UI
          petugasNama: user.nama,
          tanggal: new Date().toISOString(),
        };
        setLogs((prev) => [newLog, ...prev]);

        // Reset form
        setSelectedStudent(null);
        setStudentSearch("");
        setKasus("");
        setSolusi("");
        setSelectedSummonsId("");
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";

        setTimeout(() => setAlert(null), 5000);
      }
    });
  };

  // Filter logs based on search query and class dropdown
  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.siswaNama.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.siswaNis.includes(logSearchQuery) ||
      log.kasus.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.solusi.toLowerCase().includes(logSearchQuery.toLowerCase());
    const matchClass = logSelectedClass === "" || log.kelasNama === logSelectedClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-6 pb-24">
      {alert && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-start gap-3 ${
            alert.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 animate-fade-in"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300 animate-fade-in"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isBK ? "lg:grid-cols-3" : "grid-cols-1"} gap-6 items-start`}>
        {/* BK Input Form Section */}
        {isBK && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Catat Penanganan Baru
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Autocomplete Student Search */}
              <div className="relative animate-none">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Cari Siswa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Masukkan nama siswa atau NIS..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setSelectedStudent(null);
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentSearch("");
                        setSelectedSummonsId("");
                        setKasus("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Options */}
                {showStudentDropdown && (
                  <div className="absolute z-40 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-slate-950 border border-slate-850 shadow-2xl py-1 divide-y divide-slate-900">
                    {filteredStudents.length === 0 ? (
                      <p className="p-3 text-xs text-slate-500 text-center">Siswa tidak ditemukan.</p>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-900 text-xs transition-colors flex items-center justify-between"
                        >
                          <span className="font-semibold text-white">{s.nama}</span>
                          <span className="text-[10px] bg-slate-850 px-2 py-0.5 rounded text-slate-400">
                            {s.kelasNama}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Student Info & Case Correlation Card */}
                {selectedStudent && (
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3 mt-3 animate-fade-in text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold uppercase">Informasi Murid</span>
                      <span className="text-rose-400 font-bold bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">
                        {selectedStudent.points} Poin
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Kaitkan dengan Pelanggaran / Peringatan
                      </label>
                      {(() => {
                        const selectValue = selectedSummonsId 
                          ? (() => {
                              const warning = selectedStudent.activeWarnings.find((w) => w.id === selectedSummonsId);
                              return warning ? `summons:${warning.id}:${warning.level}:${warning.thresholdPoints}` : "kustom";
                            })()
                          : "kustom";
                        return (
                          <select
                            value={selectValue}
                            onChange={(e) => handleCaseSelection(e.target.value)}
                            className="block w-full py-2 px-2.5 border border-slate-800 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs cursor-pointer font-sans"
                          >
                            <option value="kustom">Masalah Lain / Kustom (Tulis Manual)</option>

                            {selectedStudent.activeWarnings.length > 0 && (
                              <optgroup label="Peringatan & Pemanggilan Aktif (Mengubah status menjadi Selesai)">
                                {selectedStudent.activeWarnings.map((w) => (
                                  <option key={w.id} value={`summons:${w.id}:${w.level}:${w.thresholdPoints}`}>
                                    Panggilan {w.level === 3 ? "III" : w.level === 2 ? "II" : "I"} (Batas {w.thresholdPoints} Poin)
                                  </option>
                                ))}
                              </optgroup>
                            )}

                            {selectedStudent.violations.length > 0 && (
                              <optgroup label="Pelanggaran Aktif Siswa">
                                {selectedStudent.violations.map((v) => (
                                  <option key={v.id} value={`violation:${v.id}:${v.kategori}:${v.nama}:${v.poin}`}>
                                    {v.kategori} - {v.nama} (+{v.poin} Poin)
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Kasus / Masalah Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Kasus / Masalah Siswa
                </label>
                <textarea
                  placeholder="Deskripsikan kasus atau masalah siswa..."
                  value={kasus}
                  onChange={(e) => setKasus(e.target.value)}
                  rows={3}
                  required
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm leading-relaxed"
                />
              </div>

              {/* Solusi / Tindak Lanjut Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Solusi / Tindak Lanjut BK
                </label>
                <textarea
                  placeholder="Tuliskan solusi atau tindak lanjut dari BK..."
                  value={solusi}
                  onChange={(e) => setSolusi(e.target.value)}
                  rows={3}
                  required
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm leading-relaxed"
                />
              </div>

              {/* Upload Bukti */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Unggah Bukti / Dokumen (Opsional)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-950/20"
                >
                  <Upload className="w-6 h-6 text-slate-500" />
                  <p className="text-xxs text-slate-400 text-center">
                    Klik untuk memilih berkas pendukung (Gambar / PDF)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-850 text-xxs"
                      >
                        <span className="truncate text-slate-300 max-w-[80%]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending || !selectedStudent}
                className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isPending ? "Menyimpan..." : "Simpan Penanganan"}
              </button>
            </form>
          </div>
        )}

        {/* Counseling Log History Section */}
        <div className={`bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl ${isBK ? "lg:col-span-2" : "col-span-1"} space-y-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Log Riwayat Penanganan Siswa
            </h3>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Search filter */}
              <div className="relative rounded-xl shadow-sm w-44 sm:w-60">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Cari siswa, kasus, solusi..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Class filter */}
              <select
                value={logSelectedClass}
                onChange={(e) => setLogSelectedClass(e.target.value)}
                className="py-1.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28 sm:w-36"
              >
                <option value="">Semua Kelas</option>
                {classes.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Logs */}
          <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900/60">
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Siswa</th>
                  <th className="py-3 px-4">Kasus / Masalah</th>
                  <th className="py-3 px-4">Solusi / Tindak Lanjut</th>
                  <th className="py-3 px-4 text-center w-24">Bukti</th>
                  <th className="py-3 px-4">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-slate-500 text-sm">
                      Tidak ada log riwayat penanganan siswa yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={log.id} className="text-xs hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(log.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{log.siswaNama}</div>
                        <div className="text-[10px] text-slate-400">
                          {log.kelasNama} • NIS: {log.siswaNis}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs break-words leading-relaxed text-slate-300">
                        {log.kasus}
                      </td>
                      <td className="py-3 px-4 max-w-xs break-words leading-relaxed text-slate-300">
                        {log.solusi}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1.5 flex-wrap">
                          {log.bukti.length === 0 ? (
                            <span className="text-slate-600">-</span>
                          ) : (
                            log.bukti.map((pathStr, bIdx) => (
                              <a
                                key={bIdx}
                                href={pathStr}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-7 h-7 items-center justify-center rounded bg-slate-950 border border-slate-800 text-indigo-400 hover:text-indigo-300 transition-colors"
                                title={`Bukti #${bIdx + 1}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        @{log.petugasNama}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
