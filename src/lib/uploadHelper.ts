import path from "path";
import fs from "fs";

export function getUploadBaseDir(): string {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR);
  }
  const rootUploads = path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
  if (fs.existsSync(rootUploads)) {
    return rootUploads;
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");
}

export function getUploadDir(subfolder: string = ""): string {
  const baseDir = getUploadBaseDir();
  const targetDir = subfolder ? path.join(baseDir, subfolder) : baseDir;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}
