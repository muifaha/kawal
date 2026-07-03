"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  createUserAction,
  deleteUserAction,
  createKelasAction,
  deleteKelasAction,
  createSiswaAction,
  deleteSiswaAction,
  createViolationItemAction,
  deleteViolationItemAction,
  createRemissionItemAction,
  deleteRemissionItemAction,
  createHolidayAction,
  deleteHolidayAction,
  updateKelasAssignmentAction,
  createTahunAjaranAction,
  setActiveTahunAjaranAction,
  deleteTahunAjaranAction,
  updateUserAction,
  updateSiswaAction,
  updateViolationItemAction,
  updateRemissionItemAction,
  updateHolidayAction,
  updateTahunAjaranAction,
  updateCategoryAction,
  deleteCategoryAction,
  duplicateClassStructureAction,
  graduateClassStudentsAction,
  saveSettingsAction,
  saveWeeklyHolidaysAction,
} from "@/app/actions/kesiswaan";
import ImportExcelModal from "@/components/ImportExcelModal";
import {
  Users as UsersIcon,
  BookOpen,
  UserCheck,
  AlertOctagon,
  Trash2,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Sparkles,
  Calendar,
  CalendarDays,
  Pencil,
  Check,
  X,
  GraduationCap,
  Sliders,
} from "lucide-react";

interface UserType {
  id: string;
  nip: string | null;
  username: string;
  nama: string;
  role: string;
  whatsappNumber: string | null;
}

interface TahunAjaranType {
  id: string;
  nama: string;
  isActive: boolean;
  semesterAktif: string;
  ganjilMulai: Date | string | null;
  ganjilSelesai: Date | string | null;
  genapMulai: Date | string | null;
  genapSelesai: Date | string | null;
}

const formatDate = (dateVal: Date | string | null | undefined) => {
  if (!dateVal) return "-";
  const dateObj = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  return dateObj.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateInput = (dateVal: Date | string | null | undefined) => {
  if (!dateVal) return "";
  const dateObj = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};


interface KelasType {
  id: string;
  nama: string;
  walasId: string | null;
  walas: { nama: string } | null;
  bkId: string | null;
  bk: { nama: string } | null;
  tahunAjaran: { nama: string };
}

interface SiswaType {
  id: string;
  nis: string;
  nama: string;
  kelasId: string;
  kelas: { nama: string };
}

interface DetailType {
  id: string;
  nama: string;
  poin: number;
}

interface KategoriType {
  id: string;
  nama: string;
  details: DetailType[];
}

interface RemissionType {
  id: string;
  nama: string;
  persentasePengurangan: number;
}

interface HolidayType {
  id: string;
  tanggal: Date;
  keterangan: string;
}

interface KesiswaanClientProps {
  initialUsers: UserType[];
  initialClasses: KelasType[];
  initialStudents: SiswaType[];
  categories: KategoriType[];
  initialRemissions: RemissionType[];
  initialHolidays: HolidayType[];
  initialTahunAjaran: TahunAjaranType[];
  settings: Record<string, string>;
  wakaUser?: { nama: string; nip: string | null } | null;
}

type TabType = "users" | "classes" | "students" | "violations" | "remissions" | "holidays" | "tahun_ajaran" | "settings";

export default function KesiswaanClient({
  initialUsers,
  initialClasses,
  initialStudents,
  categories,
  initialRemissions,
  initialHolidays,
  initialTahunAjaran,
  settings,
  wakaUser,
}: KesiswaanClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Inline edit state untuk penugasan kelas
  const [editingKelasId, setEditingKelasId] = useState<string>("");
  const [editWalasId, setEditWalasId] = useState<string>("");
  const [editBkId, setEditBkId] = useState<string>("");
  const [editKelasNama, setEditKelasNama] = useState<string>("");
  
  // Excel Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<TabType>("users");

  // States untuk Kategori Baru vs Lama
  const [isNewCategory, setIsNewCategory] = useState(false);

  // States untuk Edit Mode di setiap menu
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editingSiswa, setEditingSiswa] = useState<SiswaType | null>(null);
  const [editingViolation, setEditingViolation] = useState<(DetailType & { categoryId: string }) | null>(null);
  const [editingRemission, setEditingRemission] = useState<RemissionType | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<HolidayType | null>(null);
  const [editingTahunAjaran, setEditingTahunAjaran] = useState<TahunAjaranType | null>(null);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setAlert(null);
    setEditingUser(null);
    setEditingSiswa(null);
    setEditingViolation(null);
    setEditingRemission(null);
    setEditingHoliday(null);
    setEditingTahunAjaran(null);
    setEditingKelasId("");
    setEditKelasNama("");
  };

  // Form Reset Helper
  const handleAlert = (res: { success?: boolean; message?: string; error?: string }) => {
    if (res.error) {
      setAlert({ type: "error", message: res.error });
    } else if (res.success) {
      setAlert({ type: "success", message: res.message || "Data berhasil diperbarui." });
      // Reset forms manually or let page refresh handle it
      setTimeout(() => setAlert(null), 5000);
    }
  };

  // 1. Submit User
  const handleUserSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      let res;
      if (editingUser) {
        res = await updateUserAction(editingUser.id, formData);
      } else {
        res = await createUserAction(formData);
      }
      handleAlert(res);
      if (res.success) {
        (e.target as HTMLFormElement).reset();
        setEditingUser(null);
      }
    });
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun guru "${name}"?`)) return;
    setAlert(null);
    startTransition(async () => {
      const res = await deleteUserAction(id);
      handleAlert(res);
    });
  };

  // 2. Submit Kelas
  const handleCreateKelas = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createKelasAction(formData);
      handleAlert(res);
      if (res.success) (e.target as HTMLFormElement).reset();
    });
  };

  const handleDeleteKelas = async (id: string, name: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus kelas "${name}"? TINDAKAN INI AKAN MENGHAPUS SELURUH DATA SISWA DAN ABSENSI DI KELAS INI!`
      )
    )
      return;
    setAlert(null);
    startTransition(async () => {
      const res = await deleteKelasAction(id);
      handleAlert(res);
    });
  };

  const handleDuplicateClassStructure = async () => {
    if (
      !confirm(
        "Apakah Anda yakin ingin menyalin struktur seluruh nama kelas dari Tahun Pelajaran sebelumnya ke Tahun Pelajaran saat ini?"
      )
    )
      return;
    setAlert(null);
    startTransition(async () => {
      const res = await duplicateClassStructureAction();
      handleAlert(res);
    });
  };

  const handleGraduateClassStudents = async (id: string, name: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin MELULUSKAN SELURUH SISWA di kelas "${name}"? Tindakan ini akan mengubah status seluruh siswa di kelas ini menjadi LULUS.`
      )
    )
      return;
    setAlert(null);
    startTransition(async () => {
      const res = await graduateClassStudentsAction(id);
      handleAlert(res);
    });
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveSettingsAction(formData);
      handleAlert(res);
    });
  };

  const handleSaveWeeklyHolidays = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveWeeklyHolidaysAction(formData);
      handleAlert(res);
    });
  };

  // 3. Submit Siswa
  const handleSiswaSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      let res;
      if (editingSiswa) {
        res = await updateSiswaAction(editingSiswa.id, formData);
      } else {
        res = await createSiswaAction(formData);
      }
      handleAlert(res);
      if (res.success) {
        (e.target as HTMLFormElement).reset();
        setEditingSiswa(null);
      }
    });
  };

  const handleDeleteSiswa = async (id: string, name: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus siswa "${name}" beserta seluruh riwayat absensi & poinnya?`
      )
    )
      return;
    setAlert(null);
    startTransition(async () => {
      const res = await deleteSiswaAction(id);
      handleAlert(res);
    });
  };

  // 4. Submit Violation Item
  const handleViolationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const formData = new FormData(e.currentTarget);
    formData.append("isNewCategory", String(isNewCategory));
    startTransition(async () => {
      let res;
      if (editingViolation) {
        res = await updateViolationItemAction(editingViolation.id, formData);
      } else {
        res = await createViolationItemAction(formData);
      }
      handleAlert(res);
      if (res.success) {
        (e.target as HTMLFormElement).reset();
        setIsNewCategory(false);
        setEditingViolation(null);
      }
    });
  };

  const handleDeleteViolation = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus jenis pelanggaran "${name}"?`)) return;
    setAlert(null);
    startTransition(async () => {
      const res = await deleteViolationItemAction(id);
      handleAlert(res);
    });
  };

  const handleEditCategory = async (id: string, currentName: string) => {
    const newName = window.prompt("Ubah Nama Kategori Pelanggaran:", currentName);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      window.alert("Nama kategori tidak boleh kosong!");
      return;
    }
    setAlert(null);
    startTransition(async () => {
      const res = await updateCategoryAction(id, trimmed);
      handleAlert(res);
    });
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?\n\nPERINGATAN: Semua jenis pelanggaran di bawah kategori ini beserta laporan yang terkait akan ikut terhapus.`)) return;
    setAlert(null);
    startTransition(async () => {
      const res = await deleteCategoryAction(id);
      handleAlert(res);
    });
  };

  // 5. Submit Remisi
  const handleRemissionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      let res;
      if (editingRemission) {
        res = await updateRemissionItemAction(editingRemission.id, formData);
      } else {
        res = await createRemissionItemAction(formData);
      }
      handleAlert(res);
      if (res.success) {
        (e.target as HTMLFormElement).reset();
        setEditingRemission(null);
      }
    });
  };

  const handleDeleteRemission = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus jenis remisi "${name}"?`)) return;
    setAlert(null);
    startTransition(async () => {
      const res = await deleteRemissionItemAction(id);
      handleAlert(res);
    });
  };

  // 6. Submit Hari Libur
  const handleHolidaySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      let res;
      if (editingHoliday) {
        res = await updateHolidayAction(editingHoliday.id, formData);
      } else {
        res = await createHolidayAction(formData);
      }
      handleAlert(res);
      if (res.success) {
        (e.target as HTMLFormElement).reset();
        setEditingHoliday(null);
      }
    });
  };

  const handleDeleteHoliday = async (id: string, description: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus hari libur "${description}"?`)) return;
    setAlert(null);
    startTransition(async () => {
      const res = await deleteHolidayAction(id);
      handleAlert(res);
    });
  };

  // 7. Update Penugasan Kelas (Walas & BK)
  const handleStartEditAssignment = (c: KelasType) => {
    setEditingKelasId(c.id);
    setEditWalasId(c.walasId || "");
    setEditBkId(c.bkId || "");
    setEditKelasNama(c.nama);
  };

  const handleSaveAssignment = async (kelasId: string) => {
    setAlert(null);
    startTransition(async () => {
      const res = await updateKelasAssignmentAction(kelasId, editWalasId || null, editBkId || null, editKelasNama);
      handleAlert(res);
      if (res.success) {
        setEditingKelasId("");
        setEditKelasNama("");
      }
    });
  };

  // 8. Submit Tahun Ajaran Baru / Edit
  const handleTahunAjaranSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const formData = new FormData(e.currentTarget);
    const setAktifCheckbox = (e.currentTarget.querySelector('input[name="setAktifCheckbox"]') as HTMLInputElement)?.checked;
    formData.append("setAktif", String(setAktifCheckbox));
    startTransition(async () => {
      let res;
      if (editingTahunAjaran) {
        res = await updateTahunAjaranAction(editingTahunAjaran.id, formData);
      } else {
        res = await createTahunAjaranAction(formData);
      }
      handleAlert(res);
      if (res.success) {
        (e.target as HTMLFormElement).reset();
        setEditingTahunAjaran(null);
      }
    });
  };

  const handleSetActiveTahunAjaran = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin mengaktifkan Tahun Pelajaran "${name}"? Tahun Pelajaran lainnya akan dinonaktifkan.`)) return;
    setAlert(null);
    startTransition(async () => {
      const res = await setActiveTahunAjaranAction(id);
      handleAlert(res);
    });
  };

  const handleDeleteTahunAjaran = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Tahun Pelajaran "${name}"?`)) return;
    setAlert(null);
    startTransition(async () => {
      const res = await deleteTahunAjaranAction(id);
      handleAlert(res);
    });
  };

  const openImportModal = (type: TabType) => {
    setImportType(type);
    setIsImportModalOpen(true);
  };

  // Filter Guru Walas dan BK untuk dropdown
  const walasUsers = useMemo(() => initialUsers.filter((u) => u.role === "WALAS"), [initialUsers]);
  const bkUsers = useMemo(() => initialUsers.filter((u) => u.role === "BK"), [initialUsers]);

  const tabClass = (tab: TabType) =>
    `flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl border transition-all ${
      activeTab === tab
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "text-slate-400 hover:text-white border-transparent hover:bg-slate-900/30"
    }`;

  // Impor Trigger Button
  const importButton = (type: TabType) => (
    <button
      onClick={() => openImportModal(type)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 transition-all shadow"
    >
      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
      Impor Excel
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Alert Component */}
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

      {/* Tabs Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-900 pb-3">
        <button onClick={() => handleTabChange("users")} className={tabClass("users")}>
          <UsersIcon className="w-4 h-4" />
          Guru & Staff
        </button>
        <button onClick={() => handleTabChange("classes")} className={tabClass("classes")}>
          <BookOpen className="w-4 h-4" />
          Kelas Harian
        </button>
        <button onClick={() => handleTabChange("students")} className={tabClass("students")}>
          <UserCheck className="w-4 h-4" />
          Data Siswa
        </button>
        <button onClick={() => handleTabChange("violations")} className={tabClass("violations")}>
          <AlertOctagon className="w-4 h-4" />
          Jenis Pelanggaran
        </button>
        <button onClick={() => handleTabChange("remissions")} className={tabClass("remissions")}>
          <Sparkles className="w-4 h-4" />
          Jenis Remisi
        </button>
        <button onClick={() => handleTabChange("holidays")} className={tabClass("holidays")}>
          <Calendar className="w-4 h-4" />
          Hari Libur
        </button>
        <button onClick={() => handleTabChange("tahun_ajaran")} className={tabClass("tahun_ajaran")}>
          <CalendarDays className="w-4 h-4" />
          Tahun Pelajaran
        </button>
        <button onClick={() => handleTabChange("settings")} className={tabClass("settings")}>
          <Sliders className="w-4 h-4" />
          Batas Pemanggilan
        </button>
      </div>

      {/* -------------------- TAB 1: USERS -------------------- */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
                {editingUser ? (
                  <Pencil className="w-5 h-5 text-emerald-400" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                )}
                {editingUser ? "Edit Akun Guru/Staff" : "Registrasi Guru / Staff Baru"}
              </h3>
              <form key={editingUser ? editingUser.id : "new"} onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nomor Induk Pegawai (NIP)
                  </label>
                  <input
                    name="nip"
                    type="text"
                    defaultValue={editingUser?.nip || ""}
                    placeholder="Contoh: 198501012010121001 (Opsional)"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nama Lengkap
                  </label>
                  <input
                    required
                    name="nama"
                    type="text"
                    defaultValue={editingUser?.nama || ""}
                    placeholder="Contoh: Budi Santoso, S.Pd."
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Username Login
                  </label>
                  <input
                    required
                    name="username"
                    type="text"
                    defaultValue={editingUser?.username || ""}
                    placeholder="Contoh: budi_guru"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <input
                    required={!editingUser}
                    name="password"
                    type="password"
                    placeholder={editingUser ? "•••••••• (Kosongkan jika tidak diubah)" : "••••••••"}
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Akses Sistem (Role)
                  </label>
                  <select
                    required
                    name="role"
                    defaultValue={editingUser?.role || "GURU"}
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="GURU">Guru Piket / Guru Umum</option>
                    <option value="WALAS">Wali Kelas (Walas)</option>
                    <option value="BK">Guru BK (Super Admin/Approver)</option>
                    <option value="WAKA">Waka Kesiswaan (Master Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    No. WhatsApp (Opsional)
                  </label>
                  <input
                    name="whatsappNumber"
                    type="text"
                    defaultValue={editingUser?.whatsappNumber || ""}
                    placeholder="Contoh: +6281234567890"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 py-3 rounded-xl font-bold transition-all"
                  >
                    {isPending ? "Memproses..." : editingUser ? "Simpan Perubahan" : "Buat Akun"}
                  </button>
                  {editingUser && (
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 h-[550px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Daftar Pengguna Guru & Staff</h3>
                {importButton("users")}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {initialUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center gap-4 hover:border-slate-850 transition-all"
                  >
                    <div>
                      <h4 className="font-semibold text-white text-sm">{u.nama}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        NIP: <span className="text-slate-300 font-mono">{u.nip || "-"}</span> | Username:{" "}
                        <code className="text-emerald-400">{u.username}</code>
                      </p>
                      <p className="text-xs text-slate-400">WA: {u.whatsappNumber || "-"}</p>
                      <span className="inline-flex mt-1 text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                        {u.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setEditingUser(u)}
                        disabled={isPending}
                        title="Edit Akun Guru"
                        className="p-2.5 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.nama)}
                        disabled={isPending}
                        title="Hapus Akun Guru"
                        className="p-2.5 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: CLASSES -------------------- */}
      {activeTab === "classes" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-fade-in">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Buat Kelas Baru
              </h3>
              <form onSubmit={handleCreateKelas} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nama Kelas
                  </label>
                  <input
                    required
                    name="nama"
                    type="text"
                    placeholder="Contoh: XI RPL 3"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Wali Kelas (Walas)
                  </label>
                  <select
                    name="walasId"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Tanpa Wali Kelas --</option>
                    {walasUsers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Guru BK Penanggung Jawab
                  </label>
                  <select
                    name="bkId"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Tanpa Guru BK --</option>
                    {bkUsers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 py-3 rounded-xl font-bold transition-all"
                >
                  {isPending ? "Memproses..." : "Buat Kelas"}
                </button>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 h-[550px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Daftar Kelas Aktif</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDuplicateClassStructure}
                    disabled={isPending}
                    className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition-all cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Salin Kelas dari Tahun Lalu
                  </button>
                  {importButton("classes")}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {initialClasses.map((c) => {
                  const isEditing = editingKelasId === c.id;
                  return (
                    <div
                      key={c.id}
                      className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center gap-4 hover:border-slate-850 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="mb-3">
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                              Nama Kelas
                            </label>
                            <input
                              type="text"
                              value={editKelasNama}
                              onChange={(e) => setEditKelasNama(e.target.value)}
                              className="block w-full py-1.5 px-2.5 border border-slate-800 rounded-lg bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        ) : (
                          <h4 className="font-semibold text-white text-sm">{c.nama}</h4>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          Tahun Ajaran: <span className="text-emerald-400">{c.tahunAjaran.nama}</span>
                        </p>
                        
                        {isEditing ? (
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                Wali Kelas
                              </label>
                              <select
                                value={editWalasId}
                                onChange={(e) => setEditWalasId(e.target.value)}
                                className="block w-full py-1.5 px-2.5 border border-slate-800 rounded-lg bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">-- Tanpa Wali Kelas --</option>
                                {walasUsers.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.nama}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                Guru BK
                              </label>
                              <select
                                value={editBkId}
                                onChange={(e) => setEditBkId(e.target.value)}
                                className="block w-full py-1.5 px-2.5 border border-slate-800 rounded-lg bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">-- Tanpa Guru BK --</option>
                                {bkUsers.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.nama}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-0.5">
                            <p className="text-xs text-slate-300">
                              Wali Kelas:{" "}
                              <span className="font-medium text-slate-100">
                                {c.walas?.nama || "(Belum ditugaskan)"}
                              </span>
                            </p>
                            <p className="text-xs text-slate-300">
                              Guru BK:{" "}
                              <span className="font-medium text-slate-100">
                                {c.bk?.nama || "(Belum ditugaskan)"}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveAssignment(c.id)}
                              disabled={isPending}
                              title="Simpan Penugasan"
                              className="p-2.5 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl transition-all"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingKelasId("")}
                              disabled={isPending}
                              title="Batal"
                              className="p-2.5 text-slate-400 bg-slate-800/10 hover:bg-slate-800/20 border border-slate-800/20 rounded-xl transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleGraduateClassStudents(c.id, c.nama)}
                              disabled={isPending}
                              title="Luluskan Semua Siswa di Kelas Ini"
                              className="p-2.5 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/20 rounded-xl transition-all shrink-0"
                            >
                              <GraduationCap className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStartEditAssignment(c)}
                              disabled={isPending}
                              title="Edit Penugasan Kelas"
                              className="p-2.5 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteKelas(c.id, c.nama)}
                              disabled={isPending}
                              title="Hapus Kelas"
                              className="p-2.5 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: STUDENTS -------------------- */}
      {activeTab === "students" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
                {editingSiswa ? (
                  <Pencil className="w-5 h-5 text-emerald-400" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                )}
                {editingSiswa ? "Edit Data Siswa" : "Daftarkan Siswa Baru"}
              </h3>
              <form key={editingSiswa ? editingSiswa.id : "new"} onSubmit={handleSiswaSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nomor Induk Siswa (NIS)
                  </label>
                  <input
                    required
                    name="nis"
                    type="text"
                    defaultValue={editingSiswa?.nis || ""}
                    placeholder="Contoh: 10295"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nama Lengkap
                  </label>
                  <input
                    required
                    name="nama"
                    type="text"
                    defaultValue={editingSiswa?.nama || ""}
                    placeholder="Contoh: Eka Saputra"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Daftar Kelas
                  </label>
                  <select
                    required
                    name="kelasId"
                    defaultValue={editingSiswa?.kelasId || ""}
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {initialClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 py-3 rounded-xl font-bold transition-all"
                  >
                    {isPending ? "Memproses..." : editingSiswa ? "Simpan Perubahan" : "Daftarkan Siswa"}
                  </button>
                  {editingSiswa && (
                    <button
                      type="button"
                      onClick={() => setEditingSiswa(null)}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 h-[550px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Daftar Siswa Aktif</h3>
                {importButton("students")}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {initialStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center gap-4 hover:border-slate-850 transition-all"
                  >
                    <div>
                      <h4 className="font-semibold text-white text-sm">{s.nama}</h4>
                      <p className="text-xs text-slate-400">
                        NIS: <span className="text-slate-300 font-mono">{s.nis}</span> | Kelas:{" "}
                        <span className="text-emerald-400 font-semibold">{s.kelas.nama}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setEditingSiswa(s)}
                        disabled={isPending}
                        title="Edit Data Siswa"
                        className="p-2.5 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSiswa(s.id, s.nama)}
                        disabled={isPending}
                        title="Hapus Data Siswa"
                        className="p-2.5 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 4: VIOLATIONS -------------------- */}
      {activeTab === "violations" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
                {editingViolation ? (
                  <Pencil className="w-5 h-5 text-emerald-400" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                )}
                {editingViolation ? "Edit Jenis Pelanggaran" : "Tambah Jenis Pelanggaran"}
              </h3>
              <form key={editingViolation ? editingViolation.id : "new"} onSubmit={handleViolationSubmit} className="space-y-4">
                {/* Checkbox Kategori Baru */}
                <div className="flex items-center gap-2 p-1">
                  <input
                    type="checkbox"
                    id="isNewCategory"
                    checked={isNewCategory}
                    onChange={(e) => setIsNewCategory(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
                  />
                  <label htmlFor="isNewCategory" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Buat Kategori Baru
                  </label>
                </div>

                {isNewCategory ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Nama Kategori Baru
                    </label>
                    <input
                      required
                      name="categoryName"
                      type="text"
                      placeholder="Contoh: Sikap & Perilaku"
                      className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Pilih Kategori Pelanggaran (Parent)
                    </label>
                    <select
                      required
                      name="categoryId"
                      defaultValue={editingViolation?.categoryId || ""}
                      className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nama Detail Pelanggaran
                  </label>
                  <input
                    required
                    name="detailName"
                    type="text"
                    defaultValue={editingViolation?.nama || ""}
                    placeholder="Contoh: Berkata kasar di kelas"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Bobot Poin Pelanggaran
                  </label>
                  <input
                    required
                    name="points"
                    type="number"
                    min="1"
                    defaultValue={editingViolation?.poin || ""}
                    placeholder="Contoh: 15"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 py-3 rounded-xl font-bold transition-all"
                  >
                    {isPending ? "Memproses..." : editingViolation ? "Simpan Perubahan" : "Tambahkan Pelanggaran"}
                  </button>
                  {editingViolation && (
                    <button
                      type="button"
                      onClick={() => setEditingViolation(null)}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 h-[550px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Daftar Jenis Pelanggaran & Poin</h3>
                {importButton("violations")}
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="space-y-2 border-b border-slate-900/60 pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                        {cat.nama}
                      </h4>
                      <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditCategory(cat.id, cat.nama)}
                          disabled={isPending}
                          title="Edit Nama Kategori"
                          className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-slate-900/50"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.nama)}
                          disabled={isPending}
                          title="Hapus Kategori & Semua Sub-item"
                          className="text-rose-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900/50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 pl-2">
                      {cat.details.length === 0 ? (
                        <p className="text-xs text-slate-600">Tidak ada detail pelanggaran.</p>
                      ) : (
                        cat.details.map((d) => (
                          <div
                            key={d.id}
                            className="p-3 bg-slate-950/20 border border-slate-900/50 rounded-lg flex justify-between items-center text-xs shadow"
                          >
                            <span className="text-slate-200">{d.nama}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-rose-400 mr-1.5">+{d.poin} Poin</span>
                              <button
                                onClick={() => setEditingViolation({ ...d, categoryId: cat.id })}
                                disabled={isPending}
                                title="Edit Pelanggaran"
                                className="text-emerald-400 hover:text-emerald-300 shrink-0"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteViolation(d.id, d.nama)}
                                disabled={isPending}
                                title="Hapus Pelanggaran"
                                className="text-rose-500 hover:text-rose-400 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 5: REMISSIONS -------------------- */}
      {activeTab === "remissions" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
                {editingRemission ? (
                  <Pencil className="w-5 h-5 text-emerald-400" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                )}
                {editingRemission ? "Edit Kategori Remisi" : "Tambah Kategori Remisi Baru"}
              </h3>
              <form key={editingRemission ? editingRemission.id : "new"} onSubmit={handleRemissionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nama Aksi Remisi
                  </label>
                  <input
                    required
                    name="nama"
                    type="text"
                    defaultValue={editingRemission?.nama || ""}
                    placeholder="Contoh: Membawa pohon pot"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Persentase Pengurangan Poin (%)
                  </label>
                  <input
                    required
                    name="persentase"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue={editingRemission?.persentasePengurangan || ""}
                    placeholder="Contoh: 15 (artinya potong 15%)"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 py-3 rounded-xl font-bold transition-all"
                  >
                    {isPending ? "Memproses..." : editingRemission ? "Simpan Perubahan" : "Tambahkan Remisi"}
                  </button>
                  {editingRemission && (
                    <button
                      type="button"
                      onClick={() => setEditingRemission(null)}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 h-[550px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Daftar Jenis Remisi & Potongan</h3>
                {importButton("remissions")}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {initialRemissions.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center gap-4 hover:border-slate-850 transition-all"
                  >
                    <div>
                      <h4 className="font-semibold text-white text-sm">{r.nama}</h4>
                      <p className="text-xs text-emerald-400 font-semibold mt-1">
                        Persentase Potongan: {r.persentasePengurangan}% Poin
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setEditingRemission(r)}
                        disabled={isPending}
                        title="Edit Remisi"
                        className="p-2.5 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRemission(r.id, r.nama)}
                        disabled={isPending}
                        title="Hapus Remisi"
                        className="p-2.5 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 6: HOLIDAYS -------------------- */}
      {activeTab === "holidays" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-fade-in">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
                {editingHoliday ? (
                  <Pencil className="w-5 h-5 text-emerald-400" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                )}
                {editingHoliday ? "Edit Hari Libur" : "Tambah Hari Libur Baru"}
              </h3>
              <form key={editingHoliday ? editingHoliday.id : "new"} onSubmit={handleHolidaySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Tanggal Libur
                  </label>
                  <input
                    required
                    name="tanggal"
                    type="date"
                    defaultValue={editingHoliday ? new Date(editingHoliday.tanggal).toISOString().split('T')[0] : ""}
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Keterangan Libur
                  </label>
                  <input
                    required
                    name="keterangan"
                    type="text"
                    defaultValue={editingHoliday?.keterangan || ""}
                    placeholder="Contoh: Hari Raya Idul Fitri, Libur Semester"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 py-3 rounded-xl font-bold transition-all"
                  >
                    {isPending ? "Memproses..." : editingHoliday ? "Simpan Perubahan" : "Tambahkan Hari Libur"}
                  </button>
                  {editingHoliday && (
                    <button
                      type="button"
                      onClick={() => setEditingHoliday(null)}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Libur Rutin Mingguan
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                Tentukan hari di akhir pekan (Sabtu & Minggu) yang secara default diliburkan secara otomatis dari sistem absensi tanpa perlu diinput manual.
              </p>
              <form onSubmit={handleSaveWeeklyHolidays} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="libur_sabtu"
                    name="libur_sabtu"
                    defaultChecked={settings.libur_sabtu === "true"}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-400 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="libur_sabtu" className="text-xs text-slate-300 font-semibold cursor-pointer select-none">
                    Liburkan Hari Sabtu
                  </label>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="libur_minggu"
                    name="libur_minggu"
                    defaultChecked={settings.libur_minggu !== "false"}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-400 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="libur_minggu" className="text-xs text-slate-300 font-semibold cursor-pointer select-none">
                    Liburkan Hari Minggu
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs py-2.5 rounded-xl font-bold transition-all mt-2 cursor-pointer hover:scale-[1.01] active:scale-99"
                >
                  {isPending ? "Menyimpan..." : "Simpan Hari Libur Rutin"}
                </button>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 h-[550px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Daftar Hari Libur & Hari Tidak Efektif</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {initialHolidays.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 text-sm">
                    Belum ada data hari libur yang ditambahkan.
                  </div>
                ) : (
                  initialHolidays.map((h) => (
                    <div
                      key={h.id}
                      className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center gap-4 hover:border-slate-850 transition-all"
                    >
                      <div>
                        <h4 className="font-semibold text-white text-sm">{h.keterangan}</h4>
                        <p className="text-xs text-emerald-400 font-semibold mt-1">
                          Tanggal: {new Date(h.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setEditingHoliday(h)}
                          disabled={isPending}
                          title="Edit Hari Libur"
                          className="p-2.5 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(h.id, h.keterangan)}
                          disabled={isPending}
                          title="Hapus Hari Libur"
                          className="p-2.5 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 7: TAHUN AJARAN -------------------- */}
      {activeTab === "tahun_ajaran" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-fade-in">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
                {editingTahunAjaran ? (
                  <Pencil className="w-5 h-5 text-emerald-400" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                )}
                {editingTahunAjaran ? "Edit Tahun Pelajaran" : "Tambah Tahun Pelajaran"}
              </h3>
              <form key={editingTahunAjaran ? editingTahunAjaran.id : "new"} onSubmit={handleTahunAjaranSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nama Tahun Pelajaran
                  </label>
                  <input
                    required
                    name="nama"
                    type="text"
                    defaultValue={editingTahunAjaran?.nama || ""}
                    placeholder="Contoh: 2026/2027"
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Semester Aktif
                  </label>
                  <select
                    name="semesterAktif"
                    defaultValue={editingTahunAjaran?.semesterAktif || "GANJIL"}
                    className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="GANJIL">Ganjil</option>
                    <option value="GENAP">Genap</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Ganjil Mulai
                    </label>
                    <input
                      name="ganjilMulai"
                      type="date"
                      defaultValue={formatDateInput(editingTahunAjaran?.ganjilMulai)}
                      className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Ganjil Selesai
                    </label>
                    <input
                      name="ganjilSelesai"
                      type="date"
                      defaultValue={formatDateInput(editingTahunAjaran?.ganjilSelesai)}
                      className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Genap Mulai
                    </label>
                    <input
                      name="genapMulai"
                      type="date"
                      defaultValue={formatDateInput(editingTahunAjaran?.genapMulai)}
                      className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Genap Selesai
                    </label>
                    <input
                      name="genapSelesai"
                      type="date"
                      defaultValue={formatDateInput(editingTahunAjaran?.genapSelesai)}
                      className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                {!editingTahunAjaran && (
                  <div className="flex items-center gap-2.5 py-1">
                    <input
                      name="setAktifCheckbox"
                      type="checkbox"
                      id="setAktifCheckbox"
                      className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950"
                    />
                    <label htmlFor="setAktifCheckbox" className="text-xs font-semibold text-slate-300 select-none">
                      Jadikan Tahun Pelajaran Aktif Langsung
                    </label>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 py-3 rounded-xl font-bold transition-all"
                  >
                    {isPending ? "Memproses..." : editingTahunAjaran ? "Simpan Perubahan" : "Tambahkan Tahun Pelajaran"}
                  </button>
                  {editingTahunAjaran && (
                    <button
                      type="button"
                      onClick={() => setEditingTahunAjaran(null)}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 h-[650px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Daftar Tahun Pelajaran</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {initialTahunAjaran.map((ta) => (
                  <div
                    key={ta.id}
                    className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center gap-4 hover:border-slate-850 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                        {ta.nama}
                        {ta.isActive && (
                          <span className="inline-flex text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-extrabold select-none">
                            AKTIF
                          </span>
                        )}
                      </h4>
                      <div className="text-[11px] text-slate-400 mt-1.5 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span>Semester Aktif:</span>
                          <span className="text-emerald-400 font-semibold">{ta.semesterAktif}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-500">
                          <div>Ganjil: {formatDate(ta.ganjilMulai)} s/d {formatDate(ta.ganjilSelesai)}</div>
                          <div>Genap: {formatDate(ta.genapMulai)} s/d {formatDate(ta.genapSelesai)}</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1.5">
                        ID: <span className="font-mono">{ta.id}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!ta.isActive && (
                        <button
                          onClick={() => handleSetActiveTahunAjaran(ta.id, ta.nama)}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-lg transition-all"
                        >
                          Set Aktif
                        </button>
                      )}
                      
                      <button
                        onClick={() => setEditingTahunAjaran(ta)}
                        disabled={isPending}
                        title="Edit Tahun Pelajaran"
                        className="p-2.5 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteTahunAjaran(ta.id, ta.nama)}
                        disabled={isPending || ta.isActive}
                        title={ta.isActive ? "Tahun Pelajaran aktif tidak dapat dihapus" : "Hapus Tahun Pelajaran"}
                        className="p-2.5 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 8: SETTINGS -------------------- */}
      {activeTab === "settings" && (
        <div className="max-w-2xl bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl animate-fade-in">
          <h3 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            Pengaturan Batas Poin Pemanggilan Orang Tua
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Batas nilai akumulasi poin pelanggaran siswa yang akan memicu surat peringatan dan pemanggilan orang tua di Dashboard BK dan Waka Kesiswaan.
          </p>
          <form onSubmit={handleSaveSettings} encType="multipart/form-data" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pemanggilan I (Poin)
                </label>
                <input
                  required
                  name="threshold_1"
                  type="number"
                  defaultValue={settings.threshold_1 || "25"}
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pemanggilan II (Poin)
                </label>
                <input
                  required
                  name="threshold_2"
                  type="number"
                  defaultValue={settings.threshold_2 || "50"}
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pemanggilan III (Poin)
                </label>
                <input
                  required
                  name="threshold_3"
                  type="number"
                  defaultValue={settings.threshold_3 || "75"}
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            
            <hr className="border-slate-800 my-6" />
            
            <h3 className="text-lg font-bold text-white mb-4 tracking-tight">Identitas & Kop Surat Instansi</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nama Sekolah / Instansi
                </label>
                <input
                  name="school_name"
                  type="text"
                  placeholder="Contoh: SMK Negeri 1 Jakarta"
                  defaultValue={settings.school_name || ""}
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Kota / Kabupaten (Tanda Tangan)
                </label>
                <input
                  name="school_city"
                  type="text"
                  placeholder="Contoh: Jakarta"
                  defaultValue={settings.school_city || ""}
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Logo Sekolah / Instansi (Unggah Gambar)
                </label>
                <div className="flex items-center gap-4">
                  {settings.school_logo && (
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      <img src={settings.school_logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <input
                    name="school_logo_file"
                    type="file"
                    accept="image/*"
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-slate-200 hover:file:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nama Waka Kesiswaan
                </label>
                <input
                  name="waka_name"
                  type="text"
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  defaultValue={settings.waka_name || wakaUser?.nama || ""}
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  NIP Waka Kesiswaan
                </label>
                <input
                  name="waka_nip"
                  type="text"
                  placeholder="Contoh: 198001012005011002"
                  defaultValue={settings.waka_nip || wakaUser?.nip || ""}
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Gambar Kop Surat / Letterhead (Kustom untuk Undangan)
              </label>
              <p className="text-[10px] text-slate-500 mb-2">
                Rekomendasi rasio horizontal panjang (seperti gambar kop surat resmi). Jika diunggah, header teks bawaan surat undangan akan digantikan oleh gambar ini.
              </p>
              <div className="flex flex-col gap-3">
                {settings.school_header && (
                  <div className="w-full max-w-xl h-24 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={settings.school_header} alt="Kop Surat" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <input
                  name="school_header_file"
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-slate-200 hover:file:bg-slate-800"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Ukuran Kertas Default Surat Cetak
              </label>
              <select
                name="print_paper_size"
                defaultValue={settings.print_paper_size || "A4"}
                className="block w-full max-w-xs py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="F4">F4 / Folio (215 × 330 mm)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Ukuran kertas ini akan digunakan sebagai default saat mencetak surat undangan.
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isPending}
              className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 px-6 py-2.5 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-98 cursor-pointer animate-fade-in"
            >
              {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </form>
        </div>
      )}

      {/* Reusable Excel Import Modal */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entityType={importType as any}
        onSuccess={(msg) => setAlert({ type: "success", message: msg })}
        onError={(msg) => setAlert({ type: "error", message: msg })}
      />
    </div>
  );
}
