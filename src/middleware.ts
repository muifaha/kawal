import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Halaman publik yang tidak memerlukan login
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati file statis, aset, gambar, dan internal nextjs
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/") || // Lewati endpoint auth jika kustom
    pathname.includes(".") || // Lewati file statis (favicon.ico, png, dll)
    pathname === "/" // Halaman utama akan di-redirect
  ) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
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

  // Halaman khusus Guru BK
  const bkOnlyPaths = ["/absensi", "/approval", "/remisi"];
  const isBkPath = bkOnlyPaths.some((path) => pathname.startsWith(path));

  if (isBkPath && role !== "BK") {
    // Jika bukan Guru BK, tolak akses dan arahkan kembali ke Dashboard
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
