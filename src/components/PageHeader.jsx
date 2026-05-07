// src/components/PageHeader.jsx
/**
 * Universal page header for list views.
 *
 * Props:
 *  - title          string (required)  H2 text
 *  - total          number             Total items (not filtered). Shown as subtitle when no filter active.
 *  - filteredCount  number             Shown as subtitle when different from total.
 *  - button         { text, onClick, icon?, className?, disabled?, title? } | null
 *  - search         { value, onChange, placeholder? } | null
 *  - children       ReactNode          Extra elements rendered between search & button.
 */
export function PageHeader({ title, total, filteredCount, button, search, children }) {
  const isFiltered = typeof filteredCount === "number" && typeof total === "number" && filteredCount !== total;
  const subtitle = isFiltered
    ? `${filteredCount} résultat${filteredCount > 1 ? "s" : ""} sur ${total}`
    : typeof total === "number"
    ? `${total} élément${total > 1 ? "s" : ""}`
    : null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: subtitle ? 4 : 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
        <div style={{ flex: 1, minWidth: 200 }} />
        {search && (
          <input
            className="inp"
            placeholder={search.placeholder || "Rechercher…"}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            style={{ maxWidth: 220 }}
          />
        )}
        {children}
        {button && (
          <button
            className={button.className || "btn btn-primary"}
            style={{ padding: "10px 18px", whiteSpace: "nowrap" }}
            onClick={button.onClick}
            disabled={button.disabled}
            title={button.title}
          >
            {button.icon ? <span style={{ marginRight: 6 }}>{button.icon}</span> : null}
            {button.text}
          </button>
        )}
      </div>
      {subtitle && (
        <p
          style={{
            fontSize: 13,
            color: "#8E8E93",
            margin: "0 0 16px 0",
            minHeight: 18,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
