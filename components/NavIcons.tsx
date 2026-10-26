// Icônes de navigation : SVG ligne cohérents (style Lucide), rendu premium.
// stroke=currentColor -> elles héritent de la couleur du lien (actif/inactif).

const base = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg {...base}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  taches: (
    <svg {...base}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="m8.5 12 2.5 2.5 5-5.5" />
    </svg>
  ),
  contenu: (
    <svg {...base}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor" stroke="none" />
    </svg>
  ),
  prospects: (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  ),
  clients: (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M18.5 15.5c1.2.9 2 2.4 2.3 4.5" />
    </svg>
  ),
  finances: (
    <svg {...base}>
      <path d="M3 6h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  ),
  formulaires: (
    <svg {...base}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  docs: (
    <svg {...base}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 0 4 5.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </svg>
  ),
  reunions: (
    <svg {...base}>
      <rect x="3" y="4.5" width="18" height="17" rx="3" />
      <path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
      <path d="m9.5 15 2 2 3.5-4" />
    </svg>
  ),
};
