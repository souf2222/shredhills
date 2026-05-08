import { useState, useRef, useEffect } from "react";
import { COUNTRIES, CountryFlag, getCountry } from "../utils/countries";

export function CountryDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const selected = getCountry(value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Autofocus the search field when opening
  useEffect(() => {
    if (open) {
      setFilter("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const q = filter.trim().toLowerCase();
  const items = q
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    : COUNTRIES;

  const pick = (code) => { onChange(code); setOpen(false); };

  return (
    <div ref={rootRef} style={{ position:"relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width:"100%", display:"flex", alignItems:"center", gap:12,
          background:"#F2F2F7", border:"1.5px solid transparent",
          borderRadius:12, padding:"10px 14px", cursor:"pointer",
          fontFamily:"inherit", fontSize:15, color:"#1C1C1E",
          transition:"all .15s",
          ...(open ? { background:"white", borderColor:"#007AFF", boxShadow:"0 0 0 3px rgba(0,122,255,.12)" } : {}),
        }}
      >
        {selected ? (
          <>
            <CountryFlag code={selected.code} size={26}/>
            <span style={{ flex:1, textAlign:"left", fontWeight:600 }}>{selected.name}</span>
            <span style={{ fontSize:11, color:"#8E8E93", fontFamily:"monospace" }}>{selected.code}</span>
          </>
        ) : (
          <>
            <div style={{
              width:26, height:26, borderRadius:"50%",
              border:"1.5px dashed #C7C7CC", color:"#8E8E93",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13,
            }}>∅</div>
            <span style={{ flex:1, textAlign:"left", color:"#8E8E93" }}>Aucun pays</span>
          </>
        )}
        <span aria-hidden style={{ color:"#8E8E93", fontSize:11, transform: open ? "rotate(180deg)" : "none", transition:"transform .15s" }}>▼</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          style={{
            position:"absolute", top:"calc(100% + 6px)", left:0, right:0,
            background:"white", borderRadius:14,
            boxShadow:"0 12px 32px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.06)",
            zIndex:20, overflow:"hidden",
            animation:"fup .15s ease",
          }}
        >
          {/* Search */}
          <div style={{ padding:"10px 12px", borderBottom:"1px solid #F2F2F7" }}>
            <input
              ref={inputRef}
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Rechercher un pays…"
              className="inp"
              style={{ padding:"8px 12px", fontSize:14 }}
            />
          </div>

          <div style={{ maxHeight:260, overflowY:"auto", padding:"6px 0" }}>
            {/* "None" option */}
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => pick("")}
              style={{
                width:"100%", display:"flex", alignItems:"center", gap:12,
                padding:"9px 14px", background: !value ? "#EFF6FF" : "white",
                border:"none", cursor:"pointer", fontFamily:"inherit",
                textAlign:"left", color:"#1C1C1E", fontSize:14,
                borderBottom:"1px solid #F2F2F7",
              }}
              onMouseEnter={e => { if (value) e.currentTarget.style.background = "#F9F9FB"; }}
              onMouseLeave={e => { if (value) e.currentTarget.style.background = "white"; }}
            >
              <div style={{
                width:26, height:26, borderRadius:"50%",
                border:"1.5px dashed #C7C7CC", color:"#8E8E93",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, flexShrink:0,
              }}>∅</div>
              <span style={{ color:"#8E8E93" }}>Aucun pays</span>
              {!value && <span style={{ marginLeft:"auto", color:"#007AFF", fontSize:13, fontWeight:700 }}>✓</span>}
            </button>

            {items.length === 0 && (
              <div style={{ padding:"20px 14px", textAlign:"center", color:"#8E8E93", fontSize:13 }}>
                Aucun résultat
              </div>
            )}

            {items.map(c => {
              const isSelected = value === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => pick(c.code)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", gap:12,
                    padding:"9px 14px",
                    background: isSelected ? "#EFF6FF" : "white",
                    border:"none", cursor:"pointer", fontFamily:"inherit",
                    textAlign:"left", color:"#1C1C1E", fontSize:14,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#F9F9FB"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "white"; }}
                >
                  <CountryFlag code={c.code} size={26}/>
                  <span style={{ flex:1, fontWeight: isSelected ? 700 : 500 }}>{c.name}</span>
                  <span style={{ fontSize:11, color:"#8E8E93", fontFamily:"monospace" }}>{c.code}</span>
                  {isSelected && <span style={{ color:"#007AFF", fontSize:13, fontWeight:700 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
