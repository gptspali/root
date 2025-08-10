function CameraApp() {
  const [photoDataUrl, setPhotoDataUrl] = React.useState(null);
  const [error, setError] = React.useState("");
  const isActiveRef = React.useRef(true);
  const hasShotRef = React.useRef(false);

  const takePhoto = async () => {
    if (!isActiveRef.current) return;
    // сброс ошибки только если компонент активен и она была
    if (isActiveRef.current) setError((prev) => (prev ? "" : prev));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
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
      const dataUrl = canvas.toDataURL("image/png");
      if (isActiveRef.current) setPhotoDataUrl(dataUrl);

      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      if (isActiveRef.current) setError("Нет доступа к камере. Разрешите доступ в браузере.");
      console.error(e);
    }
  };

  React.useEffect(() => {
    isActiveRef.current = true;
    const rafId = requestAnimationFrame(() => {
      if (!hasShotRef.current) {
        hasShotRef.current = true;
        void takePhoto();
      }
    });
    return () => {
      isActiveRef.current = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  console.log(photoDataUrl);
  return (
    <div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {photoDataUrl && (
        <img src={photoDataUrl} alt="Снимок" style={{ width: "100%", height: "auto", display: "block" }} />
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CameraApp />);


