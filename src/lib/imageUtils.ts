/**
 * Kompresi foto secara otomatis di client-side menggunakan HTML5 Canvas dan mengonversi ke format WebP.
 * Mengubah foto berukuran besar (2MB-10MB) dari kamera HP/perangkat menjadi file WebP sangat kecil (~80KB-180KB).
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1200,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Konversi ke WebP untuk efisiensi kompresi maksimal
        let compressedDataUrl = canvas.toDataURL("image/webp", quality);
        if (!compressedDataUrl.startsWith("data:image/webp")) {
          compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
