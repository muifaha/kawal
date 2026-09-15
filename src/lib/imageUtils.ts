/**
 * Kompresi foto secara otomatis di client-side menggunakan HTML5 Canvas dan mengonversi ke format JPEG/WebP.
 * Mengubah foto berukuran besar (2MB-15MB) dari kamera HP/perangkat menjadi file terkompresi sangat kecil (~80KB-150KB).
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1000,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => resolve("");
      reader.onload = (e) => {
        try {
          const img = new Image();
          img.onerror = () => resolve("");
          img.onload = () => {
            try {
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
                resolve((e.target?.result as string) || "");
                return;
              }

              ctx.drawImage(img, 0, 0, width, height);
              let compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
              resolve(compressedDataUrl);
            } catch (err) {
              console.error("Canvas compression error:", err);
              resolve((e.target?.result as string) || "");
            }
          };
          img.src = e.target?.result as string;
        } catch (err) {
          console.error("Image load error:", err);
          resolve("");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("FileReader error:", err);
      resolve("");
    }
  });
}

