/**
 * Pemetaan ID Grup WhatsApp Resmi per Kelas.
 * Pesan kehadiran kelas otomatis dikirimkan ke grup-grup ini via WhatsApp Gateway (Fonnte API).
 */

export const CLASS_WA_GROUPS: Record<string, string[]> = {
  // ==================== KELAS X ====================
  // GRUP KELAS X.1/26
  "X 1": ["120363410396549736@g.us"],

  // 🌸Siswa-Siswi X.2💐
  "X 2": ["120363412382079527@g.us"],

  // Kelas X.3
  "X 3": ["120363428184097518@g.us"],

  // X. 4
  "X 4": ["120363427949988400@g.us"],

  // X.6 2026/2027
  "X 6": ["120363427214722194@g.us"],

  // KELAS X.7
  "X 7": ["120363410456754463@g.us"],

  // Walas & KELAS X.8 (2026-2027) & CLASS X.8
  "X 8": [
    "120363428286699158@g.us", // Walas & KELAS X.8 (2026-2027)
    "120363430828665404@g.us", // CLASS X.8
  ],

  // Kelas X.9
  "X 9": ["120363411370755315@g.us"],

  // 🎀 Kelas X.10 🩷✨
  "X 10": ["120363427180869072@g.us"],

  // ==================== KELAS XI ====================
  // XI.A1 26/27
  "XI A1": ["120363430675897444@g.us"],

  // Kelas XI A2 Thn 2026/2027
  "XI A2": ["120363426970849259@g.us"],

  // XI.B1
  "XI B1": ["120363413119293207@g.us"],

  // XI.B2 🛠️⚒️
  "XI B2": ["120363427474622572@g.us"],

  // XI.C1
  "XI C1": ["120363412461830160@g.us"],

  // XI C2
  "XI C2": ["120363426723470597@g.us"],

  // KELAS XI C3 26/27
  "XI C3": ["120363411035306005@g.us"],

  // XI.D1 26-27
  "XI D1": ["120363411631410356@g.us"],

  // Xl.D2
  "XI D2": ["120363410413482919@g.us"],

  // XI D3 (Bu Wahyu Ampryani)
  "XI D3": ["120363428967595524@g.us"],

  // ==================== KELAS XII ====================
  // KELAS XII.A1
  "XII A1": ["120363429563703182@g.us"],

  // SISWA 12 A2
  "XII A2": ["120363428722308958@g.us"],

  // twelve.a3🤩
  "XII A3": ["120363429620374551@g.us"],

  // Kelas XII.B1
  "XII B1": ["120363427708230971@g.us"],

  // KELAS XII.B2
  "XII B2": ["120363428636801999@g.us"],

  // TIK WALAS XII C1
  "XII C1": ["120363428818684433@g.us"],

  // KELAS XII.C2
  "XII C2": ["120363413668961215@g.us"],

  // XII. C3
  "XII C3": ["120363429032574338@g.us"],

  // XII.D1
  "XII D1": ["120363409465429278@g.us"],

  // XII D2 - Kaum Begadang Demi Masa Depan
  "XII D2": ["120363426315631848@g.us"],

  // XII.D3
  "XII D3": ["120363409462208883@g.us"],
};

// Aliases nama grup WhatsApp persis seperti yang diberikan
export const RAW_GROUP_ALIASES: Record<string, string[]> = {
  "CLASS X.8": ["120363430828665404@g.us"],
  "X.6 2026/2027": ["120363427214722194@g.us"],
  "KELAS X.7": ["120363410456754463@g.us"],
  "GRUP KELAS X.1/26": ["120363410396549736@g.us"],
  "Kelas X.9": ["120363411370755315@g.us"],
  "twelve.a3🤩": ["120363429620374551@g.us"],
  "Walas & KELAS X.8 (2026-2027)": ["120363428286699158@g.us"],
  "🌸Siswa-Siswi X.2💐": ["120363412382079527@g.us"],
  "Kelas XI A2 Thn 2026/2027": ["120363426970849259@g.us"],
  "XI.B2 🛠️⚒️": ["120363427474622572@g.us"],
  "🎀 Kelas X.10 🩷✨": ["120363427180869072@g.us"],
  "XII. C3": ["120363429032574338@g.us"],
  "Kelas X.3": ["120363428184097518@g.us"],
  "Xl.D2": ["120363410413482919@g.us"],
  "XII.D1": ["120363409465429278@g.us"],
  "X. 4": ["120363427949988400@g.us"],
  "XI C2": ["120363426723470597@g.us"],
  "XI.D1 26-27": ["120363411631410356@g.us"],
  "XI.A1 26/27": ["120363430675897444@g.us"],
  "XI.C1": ["120363412461830160@g.us"],
  "XI D3 (Bu Wahyu Ampryani)": ["120363428967595524@g.us"],
  "XII D2 - Kaum Begadang Demi Masa Depan": ["120363426315631848@g.us"],
  "SISWA 12 A2": ["120363428722308958@g.us"],
  "XI.B1": ["120363413119293207@g.us"],
  "KELAS XI C3 26/27": ["120363411035306005@g.us"],
  "KELAS XII.C2": ["120363413668961215@g.us"],
  "TIK WALAS XII C1": ["120363428818684433@g.us"],
  "Kelas XII.B1": ["120363427708230971@g.us"],
  "KELAS XII.B2": ["120363428636801999@g.us"],
  "XII.D3": ["120363409462208883@g.us"],
  "KELAS XII.A1": ["120363429563703182@g.us"],
};

/**
 * Normalisasi nama kelas ke format standar: "X 1", "XI A1", "XII C3", dll.
 */
export function normalizeClassName(className: string): string {
  if (!className) return "";
  let s = className.trim().toUpperCase();

  // Bersihkan karakter unicode/emoji
  s = s.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}]/gu, " ");

  // Normalisasi kata "twelve" -> "XII"
  s = s.replace(/\bTWELVE\b/gi, "XII");

  // "XL" (dengan L kecil typo) -> "XI"
  s = s.replace(/\bXL\b/g, "XI");

  // Ekstrak pola kelas umum:
  // Contoh: XII D2, XI.A1, 12 A2, X.6, X 10, XII.C3
  const match = s.match(/\b(XII|XI|X|12|11|10)[.\s_-]*([A-D]?)[.\s_-]*(\d+)\b/i);
  if (match) {
    let jenjang = match[1].toUpperCase();
    if (jenjang === "12") jenjang = "XII";
    if (jenjang === "11") jenjang = "XI";
    if (jenjang === "10") jenjang = "X";

    const abjad = (match[2] || "").toUpperCase();
    const nomor = match[3];

    if (abjad) {
      return `${jenjang} ${abjad}${nomor}`;
    } else {
      return `${jenjang} ${nomor}`;
    }
  }

  // Fallback standar
  s = s.replace(/^(KELAS|CLASS|GRUP|WALAS)\s+/gi, "");
  s = s.replace(/[\.\-_]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^(X|XI|XII)\s*(\d+)$/, "$1 $2");
  s = s.replace(/^(X|XI|XII)\s*([A-D])\s*(\d+)$/, "$1 $2$3");

  return s;
}

/**
 * Mendapatkan daftar ID Grup WhatsApp untuk suatu nama kelas.
 */
export function getClassWaGroups(className: string): string[] {
  if (!className) return [];

  // 1. Cek alias nama mentah
  if (RAW_GROUP_ALIASES[className]) {
    return RAW_GROUP_ALIASES[className];
  }

  // 2. Cek pencocokan langsung di pemetaan standar
  if (CLASS_WA_GROUPS[className]) {
    return CLASS_WA_GROUPS[className];
  }

  // 3. Coba via normalisasi nama kelas
  const normalized = normalizeClassName(className);
  if (CLASS_WA_GROUPS[normalized]) {
    return CLASS_WA_GROUPS[normalized];
  }

  // 4. Coba cari kunci yang normalisasinya cocok
  for (const [key, groups] of Object.entries(CLASS_WA_GROUPS)) {
    if (normalizeClassName(key) === normalized) {
      return groups;
    }
  }

  return [];
}
