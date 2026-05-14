// src/hooks/useListFilter.js
import { useMemo, useState } from "react";

/**
 * Simple text-based list filter hook.
 *
 * @param {Array} items            source array
 * @param {string|string[]} fields field(s) to search in
 * @param {string?} initial        initial filter text
 *
 * @returns {Object}
 *   - items     filtered array
 *   - text      current filter text
 *   - setText   setter
 *   - reset     () => void
 *   - isActive  boolean
 *   - total     original length
 *   - count     filtered length
 */
export function useListFilter(items = [], fields = "", initial = "") {
  const [text, setText] = useState(initial);
  const normalized = text.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalized) return items;
    const keys = Array.isArray(fields) ? fields : [fields];
    return items.filter((item) =>
      keys.some((k) => {
        const val = typeof k === "function" ? k(item) : item?.[k];
        return String(val ?? "").toLowerCase().includes(normalized);
      })
    );
  }, [items, fields, normalized]);

  return {
    items: filtered,
    text,
    setText,
    reset: () => setText(""),
    isActive: normalized.length > 0,
    total: items.length,
    count: filtered.length,
  };
}
