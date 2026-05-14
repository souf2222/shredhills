// src/components/ContactPicker.jsx
// Combobox searchable pour sélectionner un contact.
import { useState, useRef, useEffect } from "react";
import { formatAddressShort } from "../utils/helpers";

export function ContactPicker({ contacts, value, onChange, label = "Contact", required = false, placeholder = "Rechercher un contact…", allowManual = true }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  const selected = contacts.find((c) => c.id === (value?.id || value));

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filtered = contacts.filter((c) =>
    [c.name, c.email, c.company, c.phone, c.city, c.street].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );

  const clear = () => {
    onChange(null);
    setSearch("");
  };

  const pick = (c) => {
    onChange({
      id: c.id,
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      street: c.street || "",
      city: c.city || "",
      province: c.province || "",
      postalCode: c.postalCode || "",
      country: c.country || "",
    });
    setOpen(false);
    setSearch("");
  };

  const manualPick = () => {
    if (!search.trim()) return;
    onChange({ id: null, name: search.trim(), email: "", phone: "", street: "", city: "", province: "", postalCode: "", country: "" });
    setOpen(false);
  };

  return (
    <div>
      <label className="lbl">
        {label} {required && <span style={{ color: "#FF3B30" }}>*</span>}
      </label>

      {!value ? (
        <div ref={wrapperRef} style={{ position: "relative" }}>
          <input className="inp" type="text" placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => setOpen(true)} autoComplete="off" />
          {open && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "white", border: "1px solid #E5E5EA", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 280, overflow: "auto", padding: "6px 0" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "12px 16px", color: "#8E8E93", fontSize: 13, textAlign: "center" }}>Aucun contact trouvé</div>
              ) : (
                filtered.map((c) => (
                  <button key={c.id} type="button" onClick={() => pick(c)}
                    style={{ width: "100%", textAlign: "left", padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, display: "flex", flexDirection: "column", gap: 2 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F2F2F7")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <span style={{ fontWeight: 700, color: "#1C1C1E" }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: "#8E8E93" }}>
                      {[c.company, c.email, c.phone, formatAddressShort(c)].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))
              )}
              {allowManual && search.trim() && (
                <button type="button" onClick={manualPick}
                  style={{ width: "100%", textAlign: "left", padding: "8px 16px", background: "#F2F2F7", border: "none", borderTop: "1px solid #E5E5EA", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#007AFF", fontWeight: 600 }}>
                  ➕ Utiliser « {search.trim()} » sans créer de contact
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F2F2F7", borderRadius: 10, padding: "8px 12px", justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1C1C1E" }}>{selected?.name || value?.name || "—"}</div>
            {selected && (selected.email || selected.phone) && (
              <div style={{ fontSize: 12, color: "#8E8E93" }}>
                {[selected.email, selected.phone].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          <button type="button" onClick={clear} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#8E8E93", padding: 4 }} title="Changer">✕</button>
        </div>
      )}
    </div>
  );
}
