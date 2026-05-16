// src/components/Logo.jsx
import logoUrl from "../assets/flower_logo_black.png";

// Natural aspect ratio of the source artwork (2851 x 2639).
const ASPECT = 2851 / 2639;

/**
 * Brand logo (SH wreath).
 *
 * Props:
 *  - size: pixel height of the logo (default 32). Width scales to preserve
 *          the source artwork's natural aspect ratio.
 *  - tone: "auto" (default) renders the black artwork on transparent.
 *          "light" inverts the artwork to white (use on dark surfaces).
 *  - alt:  accessible label.
 */
export function Logo({ size = 32, tone = "auto", alt = "Shredhills" }) {
  const invert = tone === "light";
  const height = size;
  const width = Math.round(size * ASPECT);
  return (
    <img
      src={logoUrl}
      alt={alt}
      width={width}
      height={height}
      style={{
        width,
        height,
        objectFit: "contain",
        display: "block",
        filter: invert ? "invert(1)" : undefined,
        userSelect: "none",
      }}
      draggable={false}
    />
  );
}
