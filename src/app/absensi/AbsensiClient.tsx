"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { saveAttendanceAction, getAttendanceAction } from "@/app/actions/attendance";
import { AlertCircle, CheckCircle, Keyboard, Save, Search } from "lucide-react";

interface Siswa {
  id: string;
  nis: string;
  nama: string;
}

interface KelasWithSiswa {
  id: string;
  nama: string;
  siswa: Siswa[];
}

interface HolidayItem {
  date: string;
  keterangan: string;
}

interface AbsensiClientProps {
  classes: KelasWithSiswa[];
  settings: Record<string, string>;
  holidays: HolidayItem[];
  initialClassId?: string;
}

type StatusType = "H" | "S" | "I" | "A" | "D";

export default function AbsensiClient({ classes, settings, holidays, initialClassId = "" }: AbsensiClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);

  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    }
  }, [initialClassId]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  });

  const [attendanceMap, setAttendanceMap] = useState<Record<string, StatusType>>({});
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [hasExistingRecords, setHasExistingRecords] = useState(false);

  const checkIfHoliday = useCallback((dateStr: string) => {
    const holiday = holidays.find((h) => h.date === dateStr);
    if (holiday) {
      return { isHoliday: true, name: holiday.keterangan };
    }

    const dateObj = new Date(dateStr);
    const day = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
    if (day === 6 && settings.libur_sabtu === "true") {
      return { isHoliday: true, name: "Hari Sabtu (Libur Akhir Pekan)" };
    }
    if (day === 0 && settings.libur_minggu !== "false") {
      return { isHoliday: true, name: "Hari Minggu (Libur Akhir Pekan)" };
    }
    return { isHoliday: false, name: "" };
  }, [holidays, settings]);

  const holidayInfo = checkIfHoliday(selectedDate);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const students = selectedClass?.siswa || [];

  const [searchQuery, setSearchQuery] = useState("");

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const nameMatch = s.nama.toLowerCase().includes(searchQuery.toLowerCase());
      const nisMatch = s.nis.toLowerCase().includes(searchQuery.toLowerCase());
      return nameMatch || nisMatch;
    });
  }, [students, searchQuery]);

  // Load existing data jika kelas atau tanggal berubah
  useEffect(() => {
    setSearchQuery("");
    if (!selectedClassId || !selectedDate) {
      setAttendanceMap({});
      setFocusedIndex(null);
      setHasExistingRecords(false);
      return;
    }

    async function loadExistingAttendance() {
      // Set status awal sebagai Hadir (H) untuk semua siswa
      const defaultMap: Record<string, StatusType> = {};
      students.forEach((s) => {
        defaultMap[s.id] = "H";
      });
      setAttendanceMap(defaultMap);
      setFocusedIndex(null);

      // Tarik data dari database jika sudah pernah disimpan sebelumnya
      const res = await getAttendanceAction(selectedClassId, selectedDate);
      if (res.success && res.data && res.data.length > 0) {
        setHasExistingRecords(true);
        const existingMap: Record<string, StatusType> = { ...defaultMap };
        res.data.forEach((record) => {
          existingMap[record.studentId] = record.status as StatusType;
        });
        setAttendanceMap(existingMap);
      } else {
        setHasExistingRecords(false);
      }
    }

    loadExistingAttendance();
  }, [selectedClassId, selectedDate]);

  // Update status kehadiran satu siswa
  const setStatus = useCallback((studentId: string, status: StatusType) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  }, []);

  const todayStr = (() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  })();

  const isReadOnly = selectedDate !== todayStr && hasExistingRecords;

  // Keyboard Shortcuts (Arrow Keys & Keyboard Input)
  useEffect(() => {
    if (focusedIndex === null || filteredStudents.length === 0 || isReadOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeStudent = filteredStudents[focusedIndex];
      if (!activeStudent) return;

      const key = e.key.toUpperCase();

      if (key === "ARROWDOWN") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev !== null && prev < filteredStudents.length - 1 ? prev + 1 : prev));
      } else if (key === "ARROWUP") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (["H", "S", "I", "A", "D"].includes(key)) {
        e.preventDefault();
        setStatus(activeStudent.id, key as StatusType);
        
        // Auto-advance ke baris berikutnya setelah klik keyboard
        if (focusedIndex < filteredStudents.length - 1) {
          setFocusedIndex((prev) => (prev !== null ? prev + 1 : null));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, filteredStudents, setStatus, isReadOnly]);

  // Simpan Absensi
  const handleSave = useCallback(async () => {
    if (!selectedClassId || students.length === 0) return;
    if (holidayInfo.isHoliday) {
      setAlert({ type: "error", message: "Tidak dapat menyimpan absensi pada hari libur." });
      return;
    }

    setIsSaving(true);
    setAlert(null);

    const payload = students.map((s) => ({
      studentId: s.id,
      status: attendanceMap[s.id] || "H",
    }));

    const res = await saveAttendanceAction(selectedClassId, selectedDate, payload);
    setIsSaving(false);

    if (res.error) {
      setAlert({ type: "error", message: res.error });
    } else if (res.success) {
      setAlert({ type: "success", message: res.message || "Absensi berhasil disimpan!" });
      setHasExistingRecords(true);
      // Clear alert after 5 seconds
      setTimeout(() => setAlert(null), 5000);
    }
  }, [selectedClassId, students, attendanceMap, selectedDate, holidayInfo.isHoliday]);

  // Global Save Keyboard Shortcut (Ctrl+S, Cmd+S, or Enter outside inputs)
  useEffect(() => {
    if (isReadOnly || isSaving || !selectedClassId || students.length === 0) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      const isEnterOutsideInput = e.key === "Enter" && 
        document.activeElement?.tagName !== "INPUT" && 
        document.activeElement?.tagName !== "SELECT" &&
        document.activeElement?.tagName !== "TEXTAREA";

      if (isSaveShortcut || isEnterOutsideInput) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isReadOnly, isSaving, selectedClassId, students, handleSave]);

  // Hitung Summary Kehadiran
  const summary = { H: 0, S: 0, I: 0, A: 0, D: 0 };
  students.forEach((s) => {
    const status = attendanceMap[s.id] || "H";
    summary[status] = (summary[status] || 0) + 1;
  });

  // Color Map per Row
  const rowColors: Record<StatusType, string> = {
    H: "bg-transparent text-slate-300 border-slate-900/60 hover:bg-slate-900/20",
    S: "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/10 text-amber-300",
    I: "bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/10 text-sky-300",
    A: "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/10 text-rose-300",
    D: "bg-purple-500/5 hover:bg-purple-500/10 border-purple-500/10 text-purple-300",
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Controls: Dropdown Kelas & Picker Tanggal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-6 rounded-xl border border-slate-900">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Pilih Kelas
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">-- Pilih Kelas --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Tanggal Absensi
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="block w-full py-2 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isReadOnly && (
        <div className="p-4 rounded-xl text-sm border flex items-start gap-3 bg-amber-500/10 border-amber-500/20 text-amber-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
          <span>
            Absensi pada tanggal <strong>{new Date(selectedDate).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong> sudah pernah dicatat dan dikunci. Perubahan hanya diperbolehkan pada hari yang sama.
          </span>
        </div>
      )}

      {alert && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-start gap-3 ${
            alert.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
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

      {/* Main Student Roster Grid */}
      {holidayInfo.isHoliday ? (
        <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-10 shadow-2xl backdrop-blur-xl animate-fade-in font-sans">
          <div className="inline-flex w-16 h-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
            📅
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Hari Libur Terdeteksi</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Anda tidak dapat mencatat atau mengubah absensi harian pada tanggal ini karena merupakan:
            </p>
            <p className="text-amber-400 font-semibold bg-amber-500/10 inline-block px-4 py-1.5 rounded-xl border border-amber-500/20 text-sm mt-1">
              {holidayInfo.name}
            </p>
          </div>
        </div>
      ) : !selectedClassId ? (
        <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-xl">
          <p className="text-slate-500">Silakan pilih kelas terlebih dahulu untuk memuat daftar siswa.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-xl">
          <p className="text-slate-500">Tidak ada siswa aktif terdaftar di kelas ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-end text-xs text-slate-400 px-1 gap-2">
            <div className="text-slate-500 font-medium">
              Total: {students.length} Siswa {searchQuery && `(${filteredStudents.length} ditemukan)`}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama atau NIS siswa..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(null);
              }}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 2-Column Layout: Table + Recap Sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
            {/* Left: Attendance Table */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-900">
                  <thead className="bg-slate-900/50">
                    <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3 w-10">No</th>
                      <th className="py-3 px-3 w-20 hidden sm:table-cell">NIS</th>
                      <th className="py-3 px-3">Nama Lengkap</th>
                      <th className="py-3 pl-2 pr-3 text-center w-64">Aksi Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-500">
                          Tidak ada siswa yang cocok dengan pencarian "{searchQuery}".
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, index) => {
                        const status = attendanceMap[student.id] || "H";
                        const isFocused = focusedIndex === index;

                      return (
                        <tr
                          key={student.id}
                          onClick={() => setFocusedIndex(index)}
                          className={`text-sm transition-all cursor-pointer relative ${
                            isFocused 
                              ? status === "H"
                                ? "bg-emerald-500/10 text-emerald-300 outline outline-emerald-500/40 outline-offset-[-1px] z-10 shadow-lg shadow-emerald-500/5"
                                : "outline outline-emerald-500/40 outline-offset-[-1px] z-10 shadow-lg shadow-emerald-500/5 bg-slate-900/60" 
                              : ""
                          } ${isFocused && status === "H" ? "" : rowColors[status]}`}
                        >
                          <td className="py-3 px-3 font-medium text-slate-400">{index + 1}</td>
                          <td className="py-3 px-3 font-mono text-xs hidden sm:table-cell">{student.nis}</td>
                          <td className="py-3 px-3 text-sm font-semibold">{student.nama}</td>
                          <td className="py-3 pl-2 pr-3">
                            <div className="flex justify-center gap-1.5">
                              {(["H", "S", "I", "A", "D"] as const).map((s) => {
                                const activeColors = {
                                  H: "bg-emerald-500 text-emerald-950 font-bold shadow-md shadow-emerald-500/10",
                                  S: "bg-amber-500 text-amber-950 font-bold shadow-md shadow-amber-500/10",
                                  I: "bg-sky-500 text-sky-950 font-bold shadow-md shadow-sky-500/10",
                                  A: "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/10",
                                  D: "bg-purple-500 text-white font-bold shadow-md shadow-purple-500/10",
                                };

                                const inactiveColors = {
                                  H: "bg-slate-950/60 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border-slate-700/60",
                                  S: "bg-slate-950/60 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border-slate-700/60",
                                  I: "bg-slate-950/60 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border-slate-700/60",
                                  A: "bg-slate-950/60 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border-slate-700/60",
                                  D: "bg-slate-950/60 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 border-slate-700/60",
                                };

                                const labelMap = { H: "H", S: "S", I: "I", A: "A", D: "D" };

                                const isActive = status === s;

                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStatus(student.id, s);
                                      setFocusedIndex(index);
                                    }}
                                    className={`w-10 h-9 rounded-lg text-sm border flex items-center justify-center transition-all ${
                                      isActive ? activeColors[s] : inactiveColors[s]
                                    } ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                                  >
                                    {labelMap[s]}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Recap Sidebar - Siswa Tidak Hadir */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 space-y-4 h-fit xl:sticky xl:top-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Rekap Tidak Hadir
              </h3>

              {/* Summary Counts */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-2.5 text-center bg-amber-500/5 border-amber-500/20">
                  <p className="text-xl font-bold text-amber-400">{summary.S}</p>
                  <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider">Sakit</p>
                </div>
                <div className="rounded-lg border p-2.5 text-center bg-sky-500/5 border-sky-500/20">
                  <p className="text-xl font-bold text-sky-400">{summary.I}</p>
                  <p className="text-[10px] font-semibold text-sky-400/70 uppercase tracking-wider">Izin</p>
                </div>
                <div className="rounded-lg border p-2.5 text-center bg-rose-500/5 border-rose-500/20">
                  <p className="text-xl font-bold text-rose-400">{summary.A}</p>
                  <p className="text-[10px] font-semibold text-rose-400/70 uppercase tracking-wider">Alpha</p>
                </div>
                <div className="rounded-lg border p-2.5 text-center bg-purple-500/5 border-purple-500/20">
                  <p className="text-xl font-bold text-purple-400">{summary.D}</p>
                  <p className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-wider">Dispensasi</p>
                </div>
              </div>

              {/* List of absent students */}
              {(() => {
                const absentStudents = students
                  .map((s, idx) => ({ ...s, status: attendanceMap[s.id] || ("H" as StatusType), no: idx + 1 }))
                  .filter((s) => s.status !== "H");

                if (absentStudents.length === 0) {
                  return (
                    <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                      <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Semua siswa hadir 🎉</p>
                    </div>
                  );
                }

                const statusLabels: Record<StatusType, string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alpha", D: "Dispensasi" };
                const statusDots: Record<StatusType, string> = { H: "bg-emerald-500", S: "bg-amber-500", I: "bg-sky-500", A: "bg-rose-500", D: "bg-purple-500" };
                const statusTextColors: Record<StatusType, string> = { H: "text-emerald-400", S: "text-amber-400", I: "text-sky-400", A: "text-rose-400", D: "text-purple-400" };

                // Group by status
                const grouped: Partial<Record<StatusType, typeof absentStudents>> = {};
                absentStudents.forEach((s) => {
                  if (!grouped[s.status]) grouped[s.status] = [];
                  grouped[s.status]!.push(s);
                });

                const statusOrder: StatusType[] = ["A", "S", "I", "D"];

                return (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {statusOrder
                      .filter((st) => grouped[st] && grouped[st]!.length > 0)
                      .map((st) => (
                        <div key={st}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`w-2 h-2 rounded-full ${statusDots[st]}`}></span>
                            <span className={`text-xs font-bold uppercase tracking-wider ${statusTextColors[st]}`}>
                              {statusLabels[st]} ({grouped[st]!.length})
                            </span>
                          </div>
                          <div className="space-y-1">
                            {grouped[st]!.map((s) => (
                              <div
                                key={s.id}
                                onClick={() => setFocusedIndex(s.no - 1)}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60 hover:border-slate-700 transition-all cursor-pointer group"
                              >
                                <span className="text-[10px] text-slate-500 font-mono w-5 shrink-0">{s.no}</span>
                                <span className="text-xs text-slate-300 font-medium truncate group-hover:text-white transition-colors">{s.nama}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Summary Bar */}
      {selectedClassId && students.length > 0 && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-30 shadow-2xl">
          {/* Summary Counter */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-semibold">
              Hadir (H): <span className="text-emerald-400 font-bold ml-1">{summary.H}</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-semibold">
              Sakit (S): <span className="text-amber-400 font-bold ml-1">{summary.S}</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-semibold">
              Izin (I): <span className="text-sky-400 font-bold ml-1">{summary.I}</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-semibold">
              Alpha (A): <span className="text-rose-400 font-bold ml-1">{summary.A}</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-semibold">
              Disp (D): <span className="text-purple-400 font-bold ml-1">{summary.D}</span>
            </span>
          </div>

          {/* Submit Action */}
          {isReadOnly ? (
            <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 text-slate-400 px-6 py-2.5 rounded-xl text-sm font-semibold border border-slate-700">
              Absensi Terkunci
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/10 transition-all active:scale-98 cursor-pointer"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></span>
                  {hasExistingRecords ? "Memperbaharui Kehadiran..." : "Menyimpan Kehadiran..."}
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{hasExistingRecords ? "Perbaharui Kehadiran" : "Simpan Kehadiran"}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
