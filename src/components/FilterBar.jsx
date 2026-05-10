// src/components/FilterBar.jsx
/**
 * Universal filter bar for list views.
 *
 * Props:
 *  - filters        array<{ key, type, label?, value, onChange, options?, placeholder?, color?, minWidth? }>
 *                   type = "text" | "select" | "toggle-group" | "date" | "date-range"
 *  - onReset        () => void
 *  - hasFilters     boolean            Show reset button when true
 *  - children       ReactNode          Extra elements rendered after filters.
 */
import { useState, useEffect } from "react";

export function FilterBar({ filters = [], onReset, hasFilters, children }) {
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    if (!openKey) return;
    const handleDocClick = () => setOpenKey(null);
    const timer = setTimeout(() => document.addEventListener("click", handleDocClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleDocClick);
    };
  }, [openKey]);

  if (filters.length === 0 && !children) return null;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 12 }}>
      {filters.map((f) => {
        const baseStyle = {
          background: "white",
          border: "1.5px solid #E5E5EA",
          borderRadius: 20,
          padding: "6px 13px",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          color: "#3A3A3C",
        };

        if (f.type === "text") {
          return (
            <input
              key={f.key}
              className="inp"
              placeholder={f.placeholder || f.label || "Rechercher…"}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              style={{ maxWidth: 220, margin: 0 }}
            />
          );
        }

        if (f.type === "select") {
          const isOpen = openKey === f.key;
          const selected = f.options.find((o) => o.value === f.value);
          return (
            <div key={f.key} style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : f.key)}
                style={{
                  ...baseStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderColor: isOpen ? "#007AFF" : "#E5E5EA",
                }}
              >
                {selected?.label || f.value}
                <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
              </button>
              {isOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    background: "white",
                    borderRadius: 14,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                    border: "1px solid #E5E5EA",
                    padding: 6,
                    minWidth: 180,
                    zIndex: 100,
                  }}
                >
                  {f.options.map((o) => (
                    <div
                      key={o.value}
                      onClick={() => {
                        f.onChange(o.value);
                        setOpenKey(null);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: f.value === o.value ? 700 : 400,
                        color: f.value === o.value ? "#007AFF" : "#3A3A3C",
                        cursor: "pointer",
                        background: f.value === o.value ? "#007AFF18" : "transparent",
                      }}
                    >
                      {o.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        if (f.type === "toggle-group") {
          return (
            <div key={f.key} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {f.options.map((o) => {
                const active = f.value === o.value;
                const color = o.color || "#6D6D72";
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => f.onChange(o.value)}
                    style={{
                      padding: "6px 13px",
                      borderRadius: 20,
                      border: "1.5px solid",
                      borderColor: active ? color : "#E5E5EA",
                      background: active ? `${color}18` : "white",
                      color: active ? color : "#3A3A3C",
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          );
        }

        if (f.type === "date") {
          return (
            <input
              key={f.key}
              type="date"
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              style={{ ...baseStyle, cursor: "text" }}
            />
          );
        }

        if (f.type === "date-range") {
          return (
            <div key={f.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="date"
                value={f.value?.from || ""}
                onChange={(e) => f.onChange({ ...f.value, from: e.target.value })}
                style={{ ...baseStyle, cursor: "text" }}
              />
              <span style={{ color: "#8E8E93" }}>à</span>
              <input
                type="date"
                value={f.value?.to || ""}
                onChange={(e) => f.onChange({ ...f.value, to: e.target.value })}
                style={{ ...baseStyle, cursor: "text" }}
              />
            </div>
          );
        }

        return null;
      })}

      {hasFilters && (
        <button
          type="button"
          className="btn"
          onClick={onReset}
          style={{ fontSize: 13, padding: "6px 13px", borderRadius: 20, whiteSpace: "nowrap", marginLeft: "auto" }}
        >
          Réinitialiser
        </button>
      )}

      {children}
    </div>
  );
}
