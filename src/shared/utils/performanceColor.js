/** Colour scale used by map, tables, target bars */
export const PERF_SCALE = [
  { min: 100, color: '#16A34A', label: 'Above 100%' },
  { min: 80, color: '#86EFAC', label: '80 – 100%' },
  { min: 60, color: '#FCD34D', label: '60 – 80%' },
  { min: 40, color: '#FB923C', label: '40 – 60%' },
  { min: -Infinity, color: '#EF4444', label: 'Below 40%' },
];
export const NO_DATA_COLOR = '#E2E8F0';

export function perfColor(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return NO_DATA_COLOR;
  return PERF_SCALE.find((s) => pct >= s.min).color;
}

/** Text class (green / amber / red) for tables */
export function perfClass(pct) {
  if (pct >= 80) return 'text-success';
  if (pct >= 60) return 'text-warning';
  return 'text-danger';
}

/** Bar colour for target-vs-actual charts */
export function perfBarColor(pct) {
  if (pct >= 80) return '#16A34A';
  if (pct >= 60) return '#D97706';
  return '#DC2626';
}

export function qualityVariant(tag) {
  return { High: 'success', Average: 'warning', Low: 'danger', Inactive: 'neutral' }[tag] || 'neutral';
}
