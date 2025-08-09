function CameraApp() {
  const [photoDataUrl, setPhotoDataUrl] = React.useState(null);
  const [error, setError] = React.useState("");

  const takePhoto = async () => {
    setError("");
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
      setPhotoDataUrl(dataUrl);

      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      setError("Нет доступа к камере. Разрешите доступ в браузере.");
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "20px auto", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22 }}>Сделать фото</h1>
      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
      <button onClick={takePhoto} style={{ marginTop: 12, padding: "8px 14px", fontSize: 16 }}>📸 Сфоткать</button>
      {photoDataUrl && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Результат</h2>
          <img src={photoDataUrl} alt="Снимок" style={{ width: "100%", borderRadius: 8 }} />
          <a href={photoDataUrl} download="photo.png" style={{ display: "inline-block", marginTop: 10 }}>⬇️ Скачать</a>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CameraApp />);


