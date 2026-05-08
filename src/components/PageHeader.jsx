// src/components/PageHeader.jsx
/**
 * Universal page header for list views.
 *
 * Props:
 *  - title          string (required)  H2 text
 *  - total          number             Total items (not filtered). Shown as subtitle when no filter active.
 *  - filteredCount  number             Shown as subtitle when different from total.
 *  - button         { text, onClick, icon?, className?, disabled?, title? } | null
 *  - filters        ReactNode[]        FilterBar(s) rendered below the subtitle.
 *  - children       ReactNode          Extra elements rendered between title & button.
 */
export function PageHeader({
  title,
  total,
  filteredCount,
  button,
  filters,
  children,
}) {
  const isFiltered =
    typeof filteredCount === "number" &&
    typeof total === "number" &&
    filteredCount !== total;

  const subtitle = isFiltered
    ? `${filteredCount} résultat${filteredCount > 1 ? "s" : ""} sur ${total}`
    : typeof total === "number"
    ? `${total} élément${total > 1 ? "s" : ""}`
    : null;

  return (
    <div>
      <div
        className="page-header-row"
        style={{ marginBottom: subtitle ? 4 : 16 }}
      >
        <h2 className="page-header-title">{title}</h2>
        <div className="page-header-spacer" />
        {children}
        {button && (
          <button
            className={button.className || "btn btn-primary"}
            style={{ padding: "10px 18px", whiteSpace: "nowrap" }}
            onClick={button.onClick}
            disabled={button.disabled}
            title={button.title}
          >
            {button.icon ? (
              <span style={{ marginRight: 6 }}>{button.icon}</span>
            ) : null}
            {button.text}
          </button>
        )}
      </div>
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      {filters}
    </div>
  );
}
