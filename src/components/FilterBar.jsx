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
export function FilterBar({ filters = [], onReset, hasFilters, children }) {
  if (filters.length === 0 && !children) return null;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 12 }}>
      {filters.map((f) => {
        const style = {
          background: "white",
          border: "1px solid #E5E5EA",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          minWidth: f.minWidth || 140,
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
          return (
            <select key={f.key} value={f.value} onChange={(e) => f.onChange(e.target.value)} style={style}>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
              style={{ ...style, cursor: "text" }}
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
                style={{ ...style, cursor: "text" }}
              />
              <span style={{ color: "#8E8E93" }}>à</span>
              <input
                type="date"
                value={f.value?.to || ""}
                onChange={(e) => f.onChange({ ...f.value, to: e.target.value })}
                style={{ ...style, cursor: "text" }}
              />
            </div>
          );
        }

        return null;
      })}

      {children}

      {hasFilters && onReset && (
        <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 12 }} onClick={onReset}>
          ✕ Réinitialiser
        </button>
      )}
    </div>
  );
}
