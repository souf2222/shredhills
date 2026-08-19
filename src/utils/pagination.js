// src/utils/pagination.js
// Slices a filtered list into fixed-size pages. `hasMore` reports whether
// additional entries can be loaded beyond the currently fetched window, in
// which case "next" stays available even on the last loaded page.

export function paginate(entries, page, size, hasMore = false) {
  const totalPages = Math.max(1, Math.ceil(entries.length / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    page: safePage,
    totalPages,
    pageEntries: entries.slice((safePage - 1) * size, safePage * size),
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages || hasMore,
  };
}
