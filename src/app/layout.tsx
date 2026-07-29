import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import NavigationLoadingListener from "@/components/NavigationLoadingListener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kawal - Sistem Monitoring Sekolah",
  description: "Sistem monitoring sekolah, absensi harian, dan pencatatan poin pelanggaran siswa, dikelola oleh BK, Wali Kelas, dan Guru Piket.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png?v=2",
    apple: "/icons/apple-touch-icon.png?v=2",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KAWAL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#020617" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/icons/icon-192x192.png?v=2" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark') {
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.add('light');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NavigationLoadingListener />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
