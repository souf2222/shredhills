// src/components/Sidebar.jsx
// Responsive navigation: fixed sidebar on desktop, off-canvas drawer on mobile.
// - `tabs`  : [[id, label], ...] of available sections for the current user
// - `active`: current section id
// - `onNavigate`: (id) => void, called when a link is picked
// - `title` / `subtitle` / `badge`: header info (role, alerts, etc.)

import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { useAuth } from "../contexts/AuthContext";

export function Sidebar({ tabs, active, onNavigate, subtitle, badge }) {
  const { userProfile, logout } = useAuth();
  const [open, setOpen] = useState(false); // mobile drawer state

  // Close drawer on navigation and on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const pick = (id) => {
    onNavigate(id);
    setOpen(false);
  };

  const initials = (userProfile?.displayName || "?")
    .split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();

  const SidebarInner = (
    <>
      {/* Brand */}
      <div className="sb-brand">
        <Logo size={36} tone="light"/>
        <div style={{ minWidth:0 }}>
          <div className="sb-brand-title">Shredhills</div>
          {subtitle && <div className="sb-brand-sub">{subtitle}</div>}
        </div>
      </div>

      {badge && <div className="sb-badge-slot">{badge}</div>}

      {/* Nav links */}
      <nav className="sb-nav" aria-label="Sections">
        <div className="sb-section-label">Navigation</div>
        {tabs.map(([id, label]) => {
          const isActive = id === active;
          // Split emoji + text if label starts with an emoji
          const match = label.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.+)$/u);
          const icon  = match ? match[1] : "•";
          const rest  = match ? match[2] : label;
          return (
            <a
              key={id}
              href={`/${id}`}
              onClick={(e) => { e.preventDefault(); pick(id); }}
              className={`sb-link ${isActive ? "on" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="sb-link-icon" aria-hidden>{icon}</span>
              <span className="sb-link-label">{rest}</span>
              {isActive && <span className="sb-link-dot" aria-hidden/>}
            </a>
          );
        })}
      </nav>

      {/* User chip + logout at bottom */}
      <div className="sb-foot">
        <div className="sb-user">
          <div className="sb-avatar" style={{ background: userProfile?.color || "#AF52DE" }}>
            {initials}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div className="sb-user-name">{userProfile?.displayName || "—"}</div>
            <div className="sb-user-role">{userProfile?.role === "admin" ? "Administrateur" : "Utilisateur"}</div>
          </div>
        </div>
        <button className="sb-logout" onClick={logout}>
          <span aria-hidden style={{ fontSize:14 }}>⏻</span>
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: persistent sidebar */}
      <aside className="sb sb-desktop" aria-label="Navigation principale">
        {SidebarInner}
      </aside>

      {/* Mobile: top bar with hamburger */}
      <header className="sb-topbar">
        <button
          className={`sb-hamburger ${open ? "is-open" : ""}`}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          <span/><span/><span/>
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Logo size={28}/>
          <div style={{ fontWeight:700, fontSize:15, letterSpacing:"-0.01em" }}>Shredhills</div>
        </div>
        <div style={{ width:28 }}/>{/* spacer to balance layout */}
      </header>

      {/* Mobile: drawer + scrim */}
      <div
        className={`sb-scrim ${open ? "on" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <aside className={`sb sb-drawer ${open ? "on" : ""}`} aria-hidden={!open} aria-label="Menu">
        {SidebarInner}
      </aside>
    </>
  );
}
