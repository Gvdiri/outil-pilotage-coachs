// Graphes maison : zéro dépendance, thémés par variables CSS (dark mode auto).
// Les textes sont en HTML (jamais étirés) ; seul le tracé des courbes est en SVG.

export interface BarDatum {
  label: string;
  value: number;
}

/** Histogramme en HTML/CSS pur : texte net à toutes les largeurs d'écran. */
export function BarChart({
  data,
  height = 150,
  formatValue = (v) => String(v),
}: {
  data: BarDatum[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barsH = height - 22; // réserve la ligne de labels sous la baseline
  return (
    <div style={{ height }}>
      {/* Chaque barre EST l'élément flex (aucun wrapper) : les hauteurs varient
          mais items-end pose toutes les bases sur EXACTEMENT la même ligne.
          Le libellé de valeur est en position absolue -> il n'influe jamais
          sur la hauteur de la colonne. */}
      <div className="flex items-end gap-1.5 sm:gap-3" style={{ height: barsH }}>
        {data.map((d, i) => {
          const active = d.value > 0;
          const px = active ? Math.max((d.value / max) * (barsH - 20), 6) : 2;
          const last = i === data.length - 1;
          return (
            <div
              key={i}
              className="relative min-w-0 flex-1 rounded-t-md transition-all"
              style={{
                height: px,
                backgroundColor: active ? "var(--primary)" : "var(--border)",
                opacity: active ? (last ? 1 : 0.55) : 1,
              }}
            >
              {active ? (
                <span
                  className={`absolute inset-x-0 -top-5 truncate text-center text-[11px] ${last ? "font-bold" : "font-medium"} text-muted`}
                >
                  {formatValue(d.value)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {/* Ligne de labels alignée aux mêmes colonnes */}
      <div className="mt-1.5 flex gap-1.5 sm:gap-3">
        {data.map((d, i) => (
          <span key={i} className="min-w-0 flex-1 truncate text-center text-[11px] text-muted">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface LinePoint {
  label: string;
  value: number | null;
}

/**
 * Courbe simple (satisfaction, forme…). Le tracé s'étire en largeur mais les
 * textes (valeurs + labels) sont en HTML positionné : jamais déformés.
 */
export function LineChart({
  data,
  min,
  max,
  height = 130,
  color = "var(--primary)",
  formatValue = (v) => String(v),
}: {
  data: LinePoint[];
  min: number;
  max: number;
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const points = data
    .map((d, i) => ({ ...d, i }))
    .filter((d): d is { label: string; value: number; i: number } => d.value !== null);

  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted">
        Pas encore de données à tracer.
      </p>
    );
  }

  const n = Math.max(data.length, 2);
  const chartH = height - 38; // place pour valeur au-dessus + labels dessous
  // Coordonnées en % : X sur toute la largeur, Y borné [8,92] du bloc-tracé.
  const xPct = (i: number) => (n === 1 ? 50 : 6 + (i / (n - 1)) * 88);
  const yPct = (v: number) => 8 + (1 - (v - min) / (max - min)) * 84;
  const line = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${xPct(p.i).toFixed(2)},${yPct(p.value).toFixed(2)}`)
    .join(" ");
  // Aire fermée sous la courbe (dégradé léger)
  const area =
    points.length >= 2
      ? `${line} L${xPct(points[points.length - 1].i).toFixed(2)},92 L${xPct(points[0].i).toFixed(2)},92 Z`
      : "";
  const gradId = `grad-${Math.round((min + max) * 97)}`;

  return (
    <div style={{ height }} className="relative">
      {/* Bloc-tracé : SVG (ligne + aire) et points HTML partagent EXACTEMENT
          les mêmes coordonnées % -> les points tombent pile sur la ligne. */}
      <div className="absolute inset-x-0 top-5" style={{ height: chartH }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[8, 50, 92].map((y) => (
            <line
              key={y}
              x1="2"
              x2="98"
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth="0.6"
              strokeDasharray="1.5 2.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {area ? <path d={area} fill={`url(#${gradId})`} stroke="none" /> : null}
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Cercle : centré exactement sur (xPct, yPct) */}
        {points.map((p) => (
          <span
            key={`dot-${p.i}`}
            className="absolute h-2.5 w-2.5 rounded-full border-2"
            style={{
              left: `${xPct(p.i)}%`,
              top: `${yPct(p.value)}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: "var(--surface)",
              borderColor: color,
            }}
          />
        ))}
        {/* Valeur : au-dessus du point */}
        {points.map((p) => (
          <span
            key={`val-${p.i}`}
            className="absolute whitespace-nowrap text-[11px] font-semibold"
            style={{
              left: `${xPct(p.i)}%`,
              top: `${yPct(p.value)}%`,
              transform: "translate(-50%, -175%)",
              color,
            }}
          >
            {formatValue(p.value)}
          </span>
        ))}
      </div>
      {/* Labels d'axe en bas */}
      <div className="absolute inset-x-0 bottom-0">
        {data.map((d, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-muted"
            style={{ left: `${xPct(i)}%` }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Rangée de badges ✓/✗ par semaine (passage à l'action). */
export function WeeklyTicks({
  data,
}: {
  data: { label: string; done: boolean | null }[];
}) {
  if (data.every((d) => d.done === null)) {
    return (
      <p className="py-6 text-center text-xs text-muted">
        Pas encore de données de passage à l&apos;action.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2 py-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
              d.done === true
                ? "bg-[var(--tone-green-bg)] text-[var(--tone-green-fg)]"
                : d.done === false
                  ? "bg-[var(--tone-red-bg)] text-[var(--tone-red-fg)]"
                  : "bg-[var(--tone-gray-bg)] text-muted"
            }`}
            title={d.label}
          >
            {d.done === true ? "✓" : d.done === false ? "✗" : "·"}
          </span>
          <span className="text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
