/**
 * Utility untuk mengirim notifikasi WhatsApp.
 * Mendukung integrasi dengan provider WA Gateway (default: Fonnte)
 * dan mode mock untuk pengembangan lokal.
 */
export async function sendWhatsAppNotification(to: string, message: string): Promise<boolean> {
  const apiKey = process.env.WA_API_KEY;
  const apiUrl = process.env.WA_SENDER_URL || "https://api.fonnte.com/send";

  // Bersihkan format nomor telepon (menghilangkan spasi, strip, dll)
  const cleanedPhone = to.replace(/[^0-9+]/g, "");

  console.log(`\n=================== [WA OUTBOX] ===================`);
  console.log(`Kepada : ${cleanedPhone}`);
  console.log(`Pesan  :\n${message}`);
  console.log(`===================================================`);

  if (!apiKey || apiKey === "mock-api-key") {
    console.log(`[WA MOCK] Notifikasi disimulasikan berhasil (Mock Mode).`);
    return true;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target: cleanedPhone,
        message: message,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[WA ERROR] Gagal mengirim: Status ${response.status} - ${errText}`);
      return false;
    }

    const data = await response.json();
    console.log(`[WA SUCCESS] Berhasil dikirim. Response:`, data);
    return true;
  } catch (error) {
    console.error(`[WA EXCEPTION] Gagal menghubungi API WhatsApp Gateway:`, error);
    return false;
  }
}
