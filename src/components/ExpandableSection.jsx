// src/components/ExpandableSection.jsx
import { useState, useCallback } from "react";

/**
 * Composant d'accordéon réutilisable avec rendu paresseux (lazy).
 *
 * Props :
 * - title          : titre du groupe (string)
 * - count          : nombre affiché entre parenthèses (number)
 * - children       : contenu à afficher
 * - defaultExpanded: état initial ouvert/fermé (bool, default: false)
 * - lazy           : si true, les children ne sont montés/rendus qu'après
 *                    la première ouverture (bool, default: true)
 * - onExpandOnce   : callback appelé une seule fois à la première ouverture,
 *                    utile pour charger des données distantes (function)
 */
export function ExpandableSection({
  title,
  count = 0,
  children,
  defaultExpanded = false,
  lazy = true,
  onExpandOnce,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hasBeenExpanded, setHasBeenExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      if (next && !hasBeenExpanded) {
        setHasBeenExpanded(true);
        onExpandOnce?.();
      }
      return next;
    });
  }, [hasBeenExpanded, onExpandOnce]);

  const shouldRender = !lazy || hasBeenExpanded;

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={handleToggle}
        style={{
          all: "unset",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            fontSize: 9,
            color: "#8E8E93",
            transition: "transform .2s ease",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          ▶
        </span>
        <span className="sec" style={{ marginBottom: 0 }}>
          {title} ({count})
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {shouldRender ? (
            children
          ) : (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: 32,
                color: "#8E8E93",
                fontSize: 14,
              }}
            >
              <span className="sp" style={{ marginRight: 8, borderColor: "rgba(0,0,0,.1)", borderTopColor: "#8E8E93" }} />
              Chargement…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
