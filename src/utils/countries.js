// src/utils/countries.js
// Curated country list with circular SVG flag renderers.
// Each flag is a hand-crafted <svg> clipped to a circle for a consistent
// lapel-pin look that matches the rest of the UI.

import React from "react";

// ─── Flag primitives ────────────────────────────────────────────────────────
// All flags render into a 36×36 viewBox with a circular clip.
// Stripes + crosses are drawn as plain <rect>s so they scale crisply.

const Clip = ({ id, children }) => (
  <>
    <defs>
      <clipPath id={id}><circle cx="18" cy="18" r="18"/></clipPath>
    </defs>
    <g clipPath={`url(#${id})`}>{children}</g>
    <circle cx="18" cy="18" r="17.5" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1"/>
  </>
);

// Flag factory helpers for simple compositions
const VStripes = (colors) => colors.map((c, i) => (
  <rect key={i} x={(36 / colors.length) * i} y="0" width={36 / colors.length} height="36" fill={c}/>
));
const HStripes = (colors) => colors.map((c, i) => (
  <rect key={i} x="0" y={(36 / colors.length) * i} width="36" height={36 / colors.length} fill={c}/>
));

// ─── Individual flag components ─────────────────────────────────────────────
const flags = {
  CA: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#fff"/>
      <rect x="0"  y="0" width="9"  height="36" fill="#D52B1E"/>
      <rect x="27" y="0" width="9"  height="36" fill="#D52B1E"/>
      {/* Stylised maple leaf */}
      <path d="M18 9 L19.5 12.5 L23 11.5 L21.8 14.5 L25 15.5 L22 17.5 L23 19 L19.8 18.8 L20 22 L18 20.5 L16 22 L16.2 18.8 L13 19 L14 17.5 L11 15.5 L14.2 14.5 L13 11.5 L16.5 12.5 Z" fill="#D52B1E"/>
    </Clip>
  ),
  US: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#fff"/>
      {[0,2,4,6,8,10,12].map(i => <rect key={i} x="0" y={i*(36/13)} width="36" height={36/13} fill="#B22234"/>)}
      <rect x="0" y="0" width="15" height="15" fill="#3C3B6E"/>
      {[...Array(9)].map((_,r) => [...Array(r%2?5:6)].map((_,c) => (
        <circle key={`${r}-${c}`} cx={1.5 + c*2.2 + (r%2?1.1:0)} cy={1.5 + r*1.5} r=".5" fill="#fff"/>
      )))}
    </Clip>
  ),
  FR: ({ id }) => <Clip id={id}>{VStripes(["#0055A4","#fff","#EF4135"])}</Clip>,
  GB: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#012169"/>
      {/* Diagonal white */}
      <path d="M0,0 L36,36 M36,0 L0,36" stroke="#fff" strokeWidth="7"/>
      <path d="M0,0 L36,36 M36,0 L0,36" stroke="#C8102E" strokeWidth="2.5"/>
      {/* Cross white */}
      <rect x="15" y="0" width="6" height="36" fill="#fff"/>
      <rect x="0" y="15" width="36" height="6" fill="#fff"/>
      {/* Cross red */}
      <rect x="16.5" y="0" width="3" height="36" fill="#C8102E"/>
      <rect x="0" y="16.5" width="36" height="3" fill="#C8102E"/>
    </Clip>
  ),
  DE: ({ id }) => <Clip id={id}>{HStripes(["#000","#DD0000","#FFCE00"])}</Clip>,
  IT: ({ id }) => <Clip id={id}>{VStripes(["#008C45","#F4F9FF","#CD212A"])}</Clip>,
  ES: ({ id }) => (
    <Clip id={id}>
      <rect x="0" y="0"  width="36" height="9"  fill="#AA151B"/>
      <rect x="0" y="9"  width="36" height="18" fill="#F1BF00"/>
      <rect x="0" y="27" width="36" height="9"  fill="#AA151B"/>
    </Clip>
  ),
  CH: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#D52B1E"/>
      <rect x="15"  y="8" width="6"  height="20" fill="#fff"/>
      <rect x="8"   y="15" width="20" height="6" fill="#fff"/>
    </Clip>
  ),
  BE: ({ id }) => <Clip id={id}>{VStripes(["#000","#FAE042","#ED2939"])}</Clip>,
  NL: ({ id }) => <Clip id={id}>{HStripes(["#AE1C28","#fff","#21468B"])}</Clip>,
  PT: ({ id }) => (
    <Clip id={id}>
      <rect x="0" y="0"  width="14.4" height="36" fill="#006600"/>
      <rect x="14.4" y="0" width="21.6" height="36" fill="#FF0000"/>
      <circle cx="14.4" cy="18" r="5.5" fill="#FFCC00" stroke="#fff" strokeWidth=".6"/>
    </Clip>
  ),
  IE: ({ id }) => <Clip id={id}>{VStripes(["#169B62","#fff","#FF883E"])}</Clip>,
  SE: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#006AA7"/>
      <rect x="11" y="0" width="5" height="36" fill="#FECC00"/>
      <rect x="0" y="15.5" width="36" height="5" fill="#FECC00"/>
    </Clip>
  ),
  NO: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#EF2B2D"/>
      <rect x="10" y="0" width="6" height="36" fill="#fff"/>
      <rect x="0" y="15" width="36" height="6" fill="#fff"/>
      <rect x="11.5" y="0" width="3" height="36" fill="#002868"/>
      <rect x="0" y="16.5" width="36" height="3" fill="#002868"/>
    </Clip>
  ),
  DK: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#C8102E"/>
      <rect x="11" y="0" width="5" height="36" fill="#fff"/>
      <rect x="0" y="15.5" width="36" height="5" fill="#fff"/>
    </Clip>
  ),
  FI: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#fff"/>
      <rect x="11" y="0" width="6" height="36" fill="#003580"/>
      <rect x="0" y="15" width="36" height="6" fill="#003580"/>
    </Clip>
  ),
  MX: ({ id }) => (
    <Clip id={id}>
      {VStripes(["#006847","#fff","#CE1126"])}
      <circle cx="18" cy="18" r="3.5" fill="none" stroke="#8B4513" strokeWidth=".8"/>
    </Clip>
  ),
  BR: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#009C3B"/>
      <path d="M18,5 L33,18 L18,31 L3,18 Z" fill="#FFDF00"/>
      <circle cx="18" cy="18" r="5.5" fill="#002776"/>
      <path d="M12.5 17.5 Q18 14 23.5 17.5" stroke="#fff" strokeWidth=".9" fill="none"/>
    </Clip>
  ),
  AR: ({ id }) => (
    <Clip id={id}>
      {HStripes(["#74ACDF","#fff","#74ACDF"])}
      <circle cx="18" cy="18" r="2.2" fill="#F6B40E" stroke="#85340A" strokeWidth=".4"/>
    </Clip>
  ),
  JP: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#fff"/>
      <circle cx="18" cy="18" r="8" fill="#BC002D"/>
    </Clip>
  ),
  CN: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#DE2910"/>
      <text x="10" y="14" fontSize="9" fill="#FFDE00">★</text>
      <text x="17" y="7"  fontSize="4" fill="#FFDE00">★</text>
      <text x="20" y="11" fontSize="4" fill="#FFDE00">★</text>
      <text x="20" y="16" fontSize="4" fill="#FFDE00">★</text>
      <text x="17" y="19" fontSize="4" fill="#FFDE00">★</text>
    </Clip>
  ),
  KR: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#fff"/>
      <path d="M18 12 a6 6 0 0 1 0 12 a3 3 0 0 1 0 -6 a3 3 0 0 0 0 -6 Z" fill="#CD2E3A"/>
      <path d="M18 12 a6 6 0 0 0 0 12 a3 3 0 0 0 0 -6 a3 3 0 0 1 0 -6 Z" fill="#0047A0"/>
    </Clip>
  ),
  AU: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#012169"/>
      <rect x="0" y="0" width="18" height="18" fill="#012169"/>
      <path d="M0,0 L18,18 M18,0 L0,18" stroke="#fff" strokeWidth="3"/>
      <path d="M0,0 L18,18 M18,0 L0,18" stroke="#E4002B" strokeWidth="1.2"/>
      <rect x="7.5" y="0" width="3" height="18" fill="#fff"/>
      <rect x="0" y="7.5" width="18" height="3" fill="#fff"/>
      <rect x="8.25" y="0" width="1.5" height="18" fill="#E4002B"/>
      <rect x="0" y="8.25" width="18" height="1.5" fill="#E4002B"/>
    </Clip>
  ),
  NZ: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#012169"/>
      <rect x="0" y="0" width="18" height="18" fill="#012169"/>
      <path d="M0,0 L18,18 M18,0 L0,18" stroke="#fff" strokeWidth="3"/>
      <rect x="7.5" y="0" width="3" height="18" fill="#fff"/>
      <rect x="0" y="7.5" width="18" height="3" fill="#fff"/>
      <rect x="8.25" y="0" width="1.5" height="18" fill="#CC142B"/>
      <rect x="0" y="8.25" width="18" height="1.5" fill="#CC142B"/>
      <circle cx="26" cy="10" r="1.2" fill="#CC142B"/>
      <circle cx="30" cy="16" r="1.2" fill="#CC142B"/>
      <circle cx="28" cy="22" r="1.2" fill="#CC142B"/>
      <circle cx="24" cy="24" r="1.2" fill="#CC142B"/>
    </Clip>
  ),
  MA: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#C1272D"/>
      <path d="M18 11 L19.6 16 L24.8 16 L20.6 19 L22.2 24 L18 21 L13.8 24 L15.4 19 L11.2 16 L16.4 16 Z" fill="none" stroke="#006233" strokeWidth="1"/>
    </Clip>
  ),
  ZA: ({ id }) => (
    <Clip id={id}>
      <rect width="36" height="36" fill="#fff"/>
      <rect x="0" y="0"  width="36" height="18" fill="#DE3831"/>
      <rect x="0" y="18" width="36" height="18" fill="#002395"/>
      <path d="M0,0 L15,18 L0,36 Z" fill="#007A4D"/>
      <path d="M0,4 L11,18 L0,32 Z" fill="#000"/>
      <path d="M0,0 L15,18 L0,36" stroke="#FFB612" strokeWidth="2" fill="none"/>
    </Clip>
  ),
};

// ─── Public list (name + emoji fallback for selects) ───────────────────────
export const COUNTRIES = [
  { code: "CA", name: "Canada",        emoji: "🇨🇦" },
  { code: "US", name: "États-Unis",    emoji: "🇺🇸" },
  { code: "FR", name: "France",        emoji: "🇫🇷" },
  { code: "GB", name: "Royaume-Uni",   emoji: "🇬🇧" },
  { code: "DE", name: "Allemagne",     emoji: "🇩🇪" },
  { code: "IT", name: "Italie",        emoji: "🇮🇹" },
  { code: "ES", name: "Espagne",       emoji: "🇪🇸" },
  { code: "CH", name: "Suisse",        emoji: "🇨🇭" },
  { code: "BE", name: "Belgique",      emoji: "🇧🇪" },
  { code: "NL", name: "Pays-Bas",      emoji: "🇳🇱" },
  { code: "PT", name: "Portugal",      emoji: "🇵🇹" },
  { code: "IE", name: "Irlande",       emoji: "🇮🇪" },
  { code: "SE", name: "Suède",         emoji: "🇸🇪" },
  { code: "NO", name: "Norvège",       emoji: "🇳🇴" },
  { code: "DK", name: "Danemark",      emoji: "🇩🇰" },
  { code: "FI", name: "Finlande",      emoji: "🇫🇮" },
  { code: "MX", name: "Mexique",       emoji: "🇲🇽" },
  { code: "BR", name: "Brésil",        emoji: "🇧🇷" },
  { code: "AR", name: "Argentine",     emoji: "🇦🇷" },
  { code: "JP", name: "Japon",         emoji: "🇯🇵" },
  { code: "CN", name: "Chine",         emoji: "🇨🇳" },
  { code: "KR", name: "Corée du Sud",  emoji: "🇰🇷" },
  { code: "AU", name: "Australie",     emoji: "🇦🇺" },
  { code: "NZ", name: "Nouvelle-Zélande", emoji: "🇳🇿" },
  { code: "MA", name: "Maroc",         emoji: "🇲🇦" },
  { code: "ZA", name: "Afrique du Sud",emoji: "🇿🇦" },
];

export const getCountry = (code) => COUNTRIES.find(c => c.code === code) || null;

// ─── Flag component ────────────────────────────────────────────────────────
// Renders a circular flag for the given country code. Falls back to a neutral
// disc when the country is unknown (keeps layouts stable).
let uid = 0;
export function CountryFlag({ code, size = 28, style = {}, title }) {
  // Stable id per mount to avoid clipPath collisions between instances
  const idRef = React.useRef(null);
  if (idRef.current === null) idRef.current = `cf-${++uid}`;
  const Flag = code && flags[code];
  const country = getCountry(code);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      role="img"
      aria-label={title || country?.name || "flag"}
      style={{
        display: "block",
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,.18))",
        flexShrink: 0,
        ...style,
      }}
    >
      <title>{title || country?.name || "Drapeau"}</title>
      {Flag ? (
        <Flag id={idRef.current}/>
      ) : (
        <>
          <defs>
            <clipPath id={idRef.current}><circle cx="18" cy="18" r="18"/></clipPath>
          </defs>
          <g clipPath={`url(#${idRef.current})`}>
            <rect width="36" height="36" fill="#E5E5EA"/>
            <text x="18" y="23" textAnchor="middle" fontSize="16" fill="#8E8E93">🌍</text>
          </g>
          <circle cx="18" cy="18" r="17.5" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1"/>
        </>
      )}
    </svg>
  );
}
