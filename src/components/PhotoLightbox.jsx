// src/components/PhotoLightbox.jsx
// Full-screen photo viewer with download link. Click outside or Esc to close.
import { useEffect } from "react";

export function PhotoLightbox({ url, alt = "Photo", onClose }) {
  useEffect(() => {
    if (!url) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "fadeIn .15s ease",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 2,
          background: "rgba(255,255,255,.15)", color: "white",
          border: "none", borderRadius: 999, width: 44, height: 44,
          fontSize: 20, cursor: "pointer", fontFamily: "inherit",
        }}
        aria-label="Fermer"
      >
        ✕
      </button>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "absolute", bottom: 20, right: 20, zIndex: 2,
          background: "rgba(255,255,255,.15)", color: "white",
          padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
          textDecoration: "none",
        }}
      >
        ⬇ Télécharger
      </a>

      <img
        src={url}
        alt={alt}
        style={{
          maxWidth: "100%", maxHeight: "100%",
          objectFit: "contain", borderRadius: 8,
        }}
      />
    </div>
  );
}
