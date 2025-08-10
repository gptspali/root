;(function (global) {
  async function sendPhotoToTelegram(params) {
    const { botToken, chatId, photoBlob, caption } = params || {};

    if (!botToken || typeof botToken !== "string") {
      throw new Error("botToken is required");
    }
    if (!chatId) {
      throw new Error("chatId is required");
    }
    if (!(photoBlob instanceof Blob)) {
      throw new Error("photoBlob must be a Blob");
    }

    const apiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    if (caption) formData.append("caption", String(caption));
    formData.append("photo", photoBlob, "photo.png");

    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    // May be blocked by CORS when called from browsers
    if (!response.ok) {
      let details = "";
      try {
        const data = await response.json();
        details = data && data.description ? `: ${data.description}` : "";
      } catch (_) {
        /* ignore parse errors */
      }
      throw new Error(`Telegram sendPhoto failed with HTTP ${response.status}${details}`);
    }

    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  global.sendPhotoToTelegram = sendPhotoToTelegram;
})(typeof window !== "undefined" ? window : globalThis);


