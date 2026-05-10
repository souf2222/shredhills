// src/hooks/useRoute.js
// Tiny pathname-based router. No dependencies, no Router context.
// Behaviour:
//   - Reads the section from the first segment of window.location.pathname
//   - Keeps state in sync with browser back/forward (popstate)
//   - navigate(section)  → pushes a new history entry (adds to history)
//   - replace(section)   → replaces the current entry (no back-button trail)
// The nginx config already has SPA fallback (`try_files $uri /index.html`),
// so hard-refreshing on any path returns the app.

import { useCallback, useEffect, useState } from "react";

const getSectionFromPath = () => {
  const seg = window.location.pathname.split("/").filter(Boolean)[0] || "";
  return decodeURIComponent(seg);
};

export function useRoute() {
  const [section, setSection] = useState(getSectionFromPath);

  useEffect(() => {
    const onPop = () => setSection(getSectionFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next, { replace = false } = {}) => {
    const clean = (next || "").replace(/^\/+/, "");
    const url = "/" + clean + window.location.search + window.location.hash;
    if (replace) window.history.replaceState({}, "", url);
    else         window.history.pushState({}, "", url);
    setSection(clean);
  }, []);

  const replace = useCallback((next) => navigate(next, { replace: true }), [navigate]);

  return { section, navigate, replace };
}
