import path from "path";
import fs from "fs";

export function getUploadBaseDir(): string {
  // 1. Prioritaskan environment variable jika ditentukan
  if (process.env.UPLOAD_DIR) {
    const envDir = path.resolve(process.env.UPLOAD_DIR);
    if (!fs.existsSync(envDir)) {
      try {
        fs.mkdirSync(envDir, { recursive: true });
      } catch (err) {
        console.error("Gagal membuat direktori UPLOAD_DIR:", err);
      }
    }
    return envDir;
  }

  // 2. Direktori penyimpanan persisten server VPS jika ada
  if (fs.existsSync("/var/www/kawal-uploads")) {
    return "/var/www/kawal-uploads";
  }

  // 3. Symlink atau folder uploads di root proyek
  const rootUploads = path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
  if (fs.existsSync(rootUploads)) {
    return rootUploads;
  }

  // 4. Standalone parent directory (jika dijalankan dari dalam .next/standalone)
  const standaloneParentUploads = path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "..", "uploads");
  if (fs.existsSync(standaloneParentUploads)) {
    return standaloneParentUploads;
  }

  // 5. Fallback ke public/uploads
  const defaultDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

export function getUploadDir(subfolder: string = ""): string {
  const baseDir = getUploadBaseDir();
  const targetDir = subfolder ? path.join(baseDir, subfolder) : baseDir;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}
