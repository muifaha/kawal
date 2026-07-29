"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { saveAttendanceAction, getAttendanceAction } from "@/app/actions/attendance";
import { AlertCircle, CalendarCheck, CheckCircle, Keyboard, Lock, Save, Search, X } from "lucide-react";
import { useToast } from "@/components/Toast";

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
  initialDate?: string;
  userRole?: string;
}

type StatusType = "H" | "S" | "I" | "A" | "D";

export default function AbsensiClient({
  classes,
  settings,
  holidays,
  initialClassId = "",
  initialDate = "",
  userRole = "BK",
}: AbsensiClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (initialClassId) return initialClassId;
    if (classes.length === 1) return classes[0].id;
    return "";
  });

  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    } else if (classes.length === 1) {
      setSelectedClassId(classes[0].id);
    }
  }, [initialClassId, classes]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (initialDate && userRole !== "SEKRETARIS") return initialDate;
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  });

  const [attendanceMap, setAttendanceMap] = useState<Record<string, StatusType>>({});
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const [hasExistingRecords, setHasExistingRecords] = useState(false);
  const [isLockedForSekretaris, setIsLockedForSekretaris] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const checkIfHoliday = useCallback((dateStr: string) => {
    const holiday = holidays.find((h) => h.date === dateStr);
    if (holiday) {
      return { isHoliday: true, name: holiday.keterangan };
    }

    const dateObj = new Date(dateStr);
    const day = dateObj.getDay();
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

  useEffect(() => {
    setSearchQuery("");
    if (!selectedClassId || !selectedDate) {
      setAttendanceMap({});
      setFocusedIndex(null);
      setHasExistingRecords(false);
      setIsLockedForSekretaris(false);
      return;
    }

    async function loadExistingAttendance() {
      const defaultMap: Record<string, StatusType> = {};
      students.forEach((s) => {
        defaultMap[s.id] = "H";
      });
      setAttendanceMap(defaultMap);
      setFocusedIndex(null);

      const res = await getAttendanceAction(selectedClassId, selectedDate);
      if (res.success) {
        setIsLockedForSekretaris(!!res.isLockedForSekretaris);
        if (res.data && res.data.length > 0) {
          setHasExistingRecords(true);
          const existingMap: Record<string, StatusType> = { ...defaultMap };
          res.data.forEach((record) => {
            existingMap[record.studentId] = record.status as StatusType;
          });
          setAttendanceMap(existingMap);
        } else {
          setHasExistingRecords(false);
        }
      } else {
        setHasExistingRecords(false);
        setIsLockedForSekretaris(false);
      }
    }

    loadExistingAttendance();
  }, [selectedClassId, selectedDate, students]);

  const setStatus = useCallback((studentId: string, status: StatusType) => {
    if (isLockedForSekretaris) return;
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  }, [isLockedForSekretaris]);

  const isReadOnly = isLockedForSekretaris;

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
        if (focusedIndex < filteredStudents.length - 1) {
          setFocusedIndex((prev) => (prev !== null ? prev + 1 : null));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, filteredStudents, setStatus, isReadOnly]);

  const handleOpenConfirmModal = useCallback(() => {
    if (!selectedClassId || students.length === 0) return;
    if (holidayInfo.isHoliday) {
      showToast("Tidak dapat menyimpan absensi pada hari libur.", "error");
      return;
    }
    if (isReadOnly) {
      showToast("Absensi sudah pernah disimpan dan terkunci.", "error");
      return;
    }
    setShowConfirmModal(true);
  }, [selectedClassId, students, holidayInfo.isHoliday, isReadOnly, showToast]);

  const handleConfirmAndSave = useCallback(async () => {
    if (!selectedClassId || students.length === 0) return;
    setIsSaving(true);
    const payload = students.map((s) => ({
      studentId: s.id,
      status: attendanceMap[s.id] || "H",
    }));

    const res = await saveAttendanceAction(selectedClassId, selectedDate, payload);
    setIsSaving(false);

    if (res.error) {
      showToast(res.error, "error");
    } else if (res.success) {
      showToast(res.message || "Absensi berhasil disimpan!", "success");
      setHasExistingRecords(true);
      setShowConfirmModal(false);
      if (userRole === "SEKRETARIS") {
        setIsLockedForSekretaris(true);
      }
    }
  }, [selectedClassId, students, attendanceMap, selectedDate, userRole, showToast]);

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
        handleOpenConfirmModal();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isReadOnly, isSaving, selectedClassId, students, handleOpenConfirmModal]);

  const summary = { H: 0, S: 0, I: 0, A: 0, D: 0 };
  students.forEach((s) => {
    const status = attendanceMap[s.id] || "H";
    summary[status] = (summary[status] || 0) + 1;
  });

  const rowColors: Record<StatusType, string> = {
    H: "bg-transparent text-slate-300 border-slate-900/60",
    S: "bg-amber-500/5 border-amber-500/10 text-amber-300",
    I: "bg-sky-500/5 border-sky-500/10 text-sky-300",
    A: "bg-rose-500/5 border-rose-500/10 text-rose-300",
    D: "bg-purple-500/5 border-purple-500/10 text-purple-300",
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end gap-4 bg-slate-900/40 p-6 rounded-xl border border-slate-900">
        <div className="w-full md:w-56 shrink-0">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilih Kelas</label>
          <select
            value={selectedClassId}
            disabled={userRole === "SEKRETARIS" && classes.length === 1}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {classes.length === 0 ? <option value="">-- Tidak ada kelas ditugaskan --</option> : classes.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
        </div>
        <div className="w-full md:w-44 shrink-0">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tanggal Absensi</label>
          <input
            type="date"
            disabled={userRole === "SEKRETARIS"}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </div>
        <div className="w-full md:flex-1 relative">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cari Nama / NIS Siswa</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-slate-400" /></div>
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              disabled={!selectedClassId || students.length === 0}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setFocusedIndex(null); }}
              className="block w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {isLockedForSekretaris && (
        <div className="p-4 rounded-xl text-sm border flex items-start gap-3 bg-amber-500/10 border-amber-500/20 text-amber-300 animate-fade-in">
          <Lock className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-300">Absensi Hari Ini Telah Disimpan & Terkunci</h4>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Data kehadiran siswa kelas <strong>{selectedClass?.nama}</strong> untuk tanggal <strong>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong> telah berhasil disimpan dan terkunci. Jika terdapat perubahan, silakan hubungi <strong>Guru BK</strong>.
            </p>
          </div>
        </div>
      )}

      {holidayInfo.isHoliday ? (
        <div className="bg-slate-900/40 border border-amber-500/20 rounded-xl p-6 text-center space-y-4 max-w-xl mx-auto my-10 animate-fade-in">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"><CalendarCheck className="w-6 h-6" /></div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">Hari Libur Terdeteksi</h3>
            <p className="text-amber-400 font-semibold bg-amber-500/10 inline-block px-4 py-1.5 rounded-xl border border-amber-500/20 text-sm mt-1">{holidayInfo.name}</p>
          </div>
        </div>
      ) : !selectedClassId ? (
        <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-xl"><p className="text-slate-500">Silakan pilih kelas terlebih dahulu.</p></div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-xl"><p className="text-slate-500">Tidak ada siswa terdaftar.</p></div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-slate-900">
                <thead className="bg-slate-900/50">
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 w-10">No</th>
                    <th className="py-3 px-3 w-20 hidden sm:table-cell">NIS</th>
                    <th className="py-3 px-3">Nama Lengkap</th>
                    <th className="py-3 pl-2 pr-3 text-center w-64">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {filteredStudents.map((student, index) => {
                    const status = attendanceMap[student.id] || "H";
                    const isFocused = focusedIndex === index;
                    return (
                      <tr key={student.id} onClick={() => !isReadOnly && setFocusedIndex(index)} className={`text-sm transition-all relative ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"} ${isFocused ? "bg-slate-900/60 outline outline-emerald-500/40 outline-offset-[-1px] z-10" : ""} ${isFocused && status === "H" ? "" : rowColors[status]}`}>
                        <td className="py-3 px-3 font-medium text-slate-400">{index + 1}</td>
                        <td className="py-3 px-3 font-mono text-xs hidden sm:table-cell">{student.nis}</td>
                        <td className="py-3 px-3 text-sm font-semibold">{student.nama}</td>
                        <td className="py-3 pl-2 pr-3">
                          <div className="flex justify-center gap-1.5">
                            {(["H", "S", "I", "A", "D"] as const).map((s) => {
                              const active = { H: "bg-emerald-500 text-emerald-950 font-bold border-emerald-500", S: "bg-amber-500 text-amber-950 font-bold border-amber-500", I: "bg-sky-500 text-sky-950 font-bold border-sky-500", A: "bg-rose-500 text-white font-bold border-rose-500", D: "bg-purple-500 text-white font-bold border-purple-500" };
                              const inactive = { H: "bg-slate-950/60 hover:bg-emerald-500/20 text-slate-300", S: "bg-slate-950/60 hover:bg-amber-500/20 text-slate-300", I: "bg-slate-950/60 hover:bg-sky-500/20 text-slate-300", A: "bg-slate-950/60 hover:bg-rose-500/20 text-slate-300", D: "bg-slate-950/60 hover:bg-purple-500/20 text-slate-300" };
                              return (
                                <button key={s} type="button" disabled={isReadOnly} onClick={(e) => { e.stopPropagation(); setStatus(student.id, s); setFocusedIndex(index); }} className={`w-10 h-9 rounded-xl text-sm border flex items-center justify-center transition-all ${status === s ? active[s] : inactive[s]} ${isReadOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>{s}</button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 space-y-4 h-fit xl:sticky xl:top-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-400" /> Rekap Tidak Hadir</h3>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 border rounded-lg bg-amber-500/5 border-amber-500/20 text-amber-400"><p className="text-lg font-bold">{summary.S}</p> Sakit</div>
                <div className="p-2 border rounded-lg bg-sky-500/5 border-sky-500/20 text-sky-400"><p className="text-lg font-bold">{summary.I}</p> Izin</div>
                <div className="p-2 border rounded-lg bg-rose-500/5 border-rose-500/20 text-rose-400"><p className="text-lg font-bold">{summary.A}</p> Alpha</div>
                <div className="p-2 border rounded-lg bg-purple-500/5 border-purple-500/20 text-purple-400"><p className="text-lg font-bold">{summary.D}</p> Disp</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-400" /> Konfirmasi Absensi</h3>
                <p className="text-xs text-slate-400 mt-1">Kelas <strong className="text-white">{selectedClass?.nama}</strong></p>
              </div>
              <button type="button" onClick={() => setShowConfirmModal(false)} className="text-slate-500 hover:text-white p-1 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Daftar Tidak Hadir</label>
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {students.filter((s) => (attendanceMap[s.id] || "H") !== "H").map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                    <span className="font-semibold text-white">{s.nama}</span>
                    <span className="px-2 py-0.5 rounded-lg font-bold text-[10px] border bg-slate-900">{attendanceMap[s.id]}</span>
                  </div>
                ))}
              </div>
            </div>
            {userRole === "SEKRETARIS" && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                <p className="font-bold mb-1">Perhatian:</p> Setelah konfirmasi, data akan <strong>TERKUNCI</strong> dan tidak dapat diubah kembali.
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300">Batal</button>
              <button onClick={handleConfirmAndSave} disabled={isSaving} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 rounded-xl flex items-center gap-2">
                {isSaving ? "Menyimpan..." : "Konfirmasi & Simpan Final"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedClassId && students.length > 0 && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/80 p-4 flex items-center justify-end z-30">
          {isReadOnly ? (
            <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 text-slate-400 px-6 py-2.5 rounded-xl text-sm font-semibold border border-slate-700">
              <Lock className="w-4 h-4" /> <span>Absensi Hari Ini Terkunci</span>
            </div>
          ) : (
            <button onClick={handleOpenConfirmModal} disabled={isSaving} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-98 cursor-pointer">
              <Save className="w-4 h-4" /> <span>{hasExistingRecords ? "Perbaharui Kehadiran" : "Simpan Kehadiran"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
