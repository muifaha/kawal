/**
 * Utilitas untuk pemeriksaan aturan remisi
 */

/**
 * Cek apakah sebuah nama MasterRemisi merupakan jenis remisi prestasi
 * (Tingkat Sekolah, Kota/Kabupaten, Provinsi, Nasional/Internasional, dsb.)
 */
export function isPrestasiRemisi(nama?: string | null): boolean {
  if (!nama) return false;
  const n = nama.toLowerCase();
  return (
    n.includes("meraih prestasi") ||
    (n.includes("prestasi") &&
      (n.includes("tingkat") ||
        n.includes("sekolah") ||
        n.includes("kota") ||
        n.includes("kabupaten") ||
        n.includes("provinsi") ||
        n.includes("nasional") ||
        n.includes("internasional") ||
        n.includes("juara")))
  );
}
