// src/components/PhotoUpload.jsx
// Reusable photo picker with live preview.
// Works on mobile (camera capture) and desktop (file picker).
import { useRef, useState, useEffect } from "react";

export function PhotoUpload({
  value = null,           // File object (controlled)
  onChange,               // (File|null) => void
  existingUrl = null,     // Already-uploaded URL to show when editing
  label = "📸 Prendre ou choisir une photo",
  accept = "image/*",
  capture = "environment",
  required = false,
}) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  // Build/revoke object URL preview whenever the File changes.
  useEffect(() => {
    if (!value) { setPreview(null); return; }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const displayUrl = preview || existingUrl;

  const handleFile = (e) => {
    const file = e.target.files?.[0] || null;
    onChange?.(file);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = "";
    onChange?.(null);
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {!displayUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn btn-outline"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "14px",
            border: `2px dashed ${required ? "#FF9500" : "#E5E5EA"}`,
            background: "#F9F9FB",
          }}
        >
          {label}{required ? " *" : ""}
        </button>
      )}

      {displayUrl && (
        <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "#000" }}>
          <img
            src={displayUrl}
            alt="Aperçu de la facture"
            style={{ width: "100%", maxHeight: 280, objectFit: "contain", display: "block" }}
          />
          <div style={{
            position: "absolute", top: 8, right: 8, display: "flex", gap: 6,
          }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                background: "rgba(0,0,0,.7)", color: "white", border: "none",
                borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              🔄 Changer
            </button>
            <button
              type="button"
              onClick={clear}
              style={{
                background: "rgba(255,59,48,.9)", color: "white", border: "none",
                borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
