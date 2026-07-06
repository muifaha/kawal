"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import {
  LayoutDashboard,
  CalendarCheck,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  LogOut,
  Menu,
  X,
  User,
  Settings,
  Sun,
  Moon,
  ClipboardList,
  UserPlus,
  HeartHandshake,
} from "lucide-react";

interface SidebarLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
}

export default function SidebarLayout({ children, user }: SidebarLayoutProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [schoolName, setSchoolName] = useState("KAWAL");
  const [schoolLogo, setSchoolLogo] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.schoolName) setSchoolName(data.schoolName);
        if (data.schoolLogo) setSchoolLogo(data.schoolLogo);
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const activeTheme = savedTheme || "light";
    setTheme(activeTheme);
    if (activeTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["WAKA", "BK", "WALAS", "GURU"],
    },
    {
      name: "Absensi Harian",
      href: "/absensi",
      icon: CalendarCheck,
      roles: ["BK"],
    },
    {
      name: "Pelanggaran Siswa",
      href: "/pelanggaran",
      icon: AlertTriangle,
      roles: ["BK", "WALAS", "GURU"],
    },
    {
      name: "Persetujuan Pelanggaran",
      href: "/approval",
      icon: CheckSquare,
      roles: ["BK"],
    },
    {
      name: "Remisi Poin",
      href: "/remisi",
      icon: Sparkles,
      roles: ["BK"],
    },
    {
      name: "Penanganan Siswa",
      href: "/penanganan",
      icon: ClipboardList,
      roles: ["BK", "WAKA"],
    },
    {
      name: "Rujukan BK",
      href: "/rujukan",
      icon: UserPlus,
      roles: ["BK", "WAKA", "WALAS", "GURU"],
    },
    {
      name: "Bimbingan Konseling",
      href: "/bimbingan",
      icon: HeartHandshake,
      roles: ["BK", "WAKA", "WALAS"],
    },
    {
      name: "Jadwal & Jurnal",
      href: "/jadwal",
      icon: CalendarCheck,
      roles: ["WAKA", "WALAS", "GURU"],
    },
    {
      name: "Manajemen Kesiswaan",
      href: "/kesiswaan",
      icon: Settings,
      roles: ["WAKA"],
    },
  ];

  const filteredNavigation = navigation.filter((item) => item.roles.includes(user.role));

  const roleColors: Record<string, string> = {
    WAKA: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    BK: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    WALAS: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    GURU: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-800 bg-slate-900/30 backdrop-blur-xl animate-fade-in">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo */}
          <div className="flex flex-col justify-center py-4 px-6 border-b border-slate-800 shrink-0 h-16">
            <div className="flex items-center gap-3">
              {schoolLogo ? (
                <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                  K
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-extrabold tracking-tight text-white leading-tight truncate">
                  {schoolName}
                </span>
                <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase leading-none mt-0.5">
                  powered by KAWAL
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                      : "text-slate-400 hover:bg-slate-900/40 hover:text-white border border-transparent"
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 transition-all ${
                      isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-slate-800">
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-rose-400 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-800"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Keluar
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (Overlay & Panel) */}
      {isMobileOpen && (
        <div className="relative z-50 md:hidden animate-fade-in">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-slate-900 p-6 flex flex-col border-r border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {schoolLogo ? (
                  <div className="w-6 h-6 rounded bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                    K
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white leading-tight truncate max-w-[150px]">
                    {schoolName}
                  </span>
                  <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase leading-none mt-0.5">
                    powered by KAWAL
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                      isActive ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="pt-4 border-t border-slate-800">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-rose-400 rounded-xl transition-all"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Keluar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Sticky Unified Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-sm">
          {/* Left side: Hamburger button for Mobile, App Title for Desktop */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            {schoolLogo ? (
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 md:hidden">
                <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0 md:hidden">
                K
              </div>
            )}
            <span className="text-sm font-semibold text-slate-400 hidden md:inline">
              Sistem Absensi & Pelanggaran Siswa
            </span>
          </div>

          {/* Right side: Theme Toggle & User Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all focus:outline-none shrink-0"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right flex flex-col justify-center">
                <p className="text-xs sm:text-sm font-semibold text-white leading-tight truncate max-w-[80px] sm:max-w-[180px]">
                  {user.nama}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[80px] sm:max-w-[180px]">
                  @{user.username}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
