import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Halaman publik yang tidak memerlukan login
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/alumni", "/ppid"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati file statis, aset, gambar, API alumni public, ppid, dan internal nextjs
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/pddikti/") ||
    pathname.startsWith("/alumni") ||
    pathname.startsWith("/ppid") ||
    pathname.includes(".") ||
    pathname === "/"
  ) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const res = NextResponse.next();
    if (pathname.startsWith("/alumni") || pathname.startsWith("/ppid")) {
      res.headers.set("Content-Security-Policy", "frame-ancestors *;");
    }
    return res;
  }

  // Ambil token sesi dari cookie
  const sessionCookie = request.cookies.get("kawal_session")?.value;

  // Jika tidak sedang login dan mencoba mengakses rute terproteksi
  if (!sessionCookie) {
    if (!PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Jika sudah login dan mencoba mengakses halaman login, arahkan ke dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Dekode JWT secara manual (karena Edge runtime Next.js tidak mendukung pustaka jsonwebtoken penuh)
  let user: { id: string; username: string; role: string; nama: string } | null = null;
  try {
    const payloadBase64 = sessionCookie.split(".")[1];
    if (payloadBase64) {
      const decodedPayload = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
      user = JSON.parse(decodedPayload);
    }
  } catch (e) {
    console.error("Gagal men-decode token sesi di middleware:", e);
    // Jika token tidak valid, hapus cookie dan arahkan ke login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("kawal_session");
    return response;
  }

  if (!user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("kawal_session");
    return response;
  }

  // Proteksi Rute Berdasarkan Role
  const role = user.role;

  // Halaman Catat Absensi Harian (Dapat diakses oleh SEKRETARIS, WAKA, dan BK)
  if (pathname.startsWith("/absensi") && !["SEKRETARIS", "WAKA", "BK"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
  }

  // Halaman Rekap Absensi (Dapat diakses oleh BK, WAKA, WALAS, GURU, SEKRETARIS, dan PIKET)
  if (pathname.startsWith("/rekap-absensi") && !["BK", "WAKA", "WALAS", "GURU", "SEKRETARIS", "PIKET"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
  }

  // Halaman Rekap Pelanggaran (Dapat diakses oleh BK, WAKA, WALAS, GURU, SEKRETARIS, dan PIKET)
  if (pathname.startsWith("/rekap-pelanggaran") && !["BK", "WAKA", "WALAS", "GURU", "SEKRETARIS", "PIKET"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
  }

  // Halaman Prestasi Siswa (Dapat diakses oleh WAKA, BK, GURU, PEMBINA_OSIS, dan WALAS)
  if (pathname.startsWith("/prestasi") && !["WAKA", "BK", "GURU", "PEMBINA_OSIS", "WALAS"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
  }

  // Halaman Rekap Alumni & Tracer Study (Dapat diakses oleh WAKA, BK, WALAS, dan GURU)
  if (pathname.startsWith("/rekap-alumni") && !["WAKA", "BK", "WALAS", "GURU"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
  }

  // Halaman khusus Guru BK (Approval & Remisi Poin)
  const bkOnlyPaths = ["/approval", "/remisi"];
  const isBkPath = bkOnlyPaths.some((path) => pathname.startsWith(path));

  if (isBkPath && role !== "BK" && role !== "WAKA") {
    // Jika bukan Guru BK / Waka, tolak akses dan arahkan kembali ke Dashboard
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
  }

  // Halaman khusus Waka Kesiswaan
  const wakaOnlyPaths = ["/kesiswaan"];
  const isWakaPath = wakaOnlyPaths.some((path) => pathname.startsWith(path));

  if (isWakaPath && role !== "WAKA") {
    // Jika bukan Waka Kesiswaan, tolak akses dan arahkan kembali ke Dashboard
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
  }

  return NextResponse.next();
}

// Konfigurasi matcher rute mana saja yang masuk ke middleware
export const config = {
  matcher: [
    /*
     * Cocokkan semua rute kecuali yang dimulai dengan:
     * - api (rute API internal jika ada)
     * - _next/static (file statis)
     * - _next/image (optimasi gambar Next.js)
     * - favicon.ico (icon browser)
     */
    "/((?!api/public|_next/static|_next/image|favicon.ico).*)",
  ],
};
