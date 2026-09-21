
/** Tinted card variants — background, border and number colour (matches Saralya application summary tiles) */
const TINTS = {
  orange: { bg: '#fffbeb', border: '#fde68a', num: '#b45309' },
  green: { bg: '#f0fdf4', border: '#bbf7d0', num: '#15803d' },
  red: { bg: '#fef2f2', border: '#fecaca', num: '#b91c1c' },
  blue: { bg: '#eff6ff', border: '#bfdbfe', num: '#1d4ed8' },
  pink: { bg: '#fff1f2', border: '#fecdd3', num: '#be123c' },
  purple: { bg: '#f5f0ff', border: '#ddd6fe', num: '#6f41c2' },
  teal: { bg: '#ecfeff', border: '#a5f3fc', num: '#0e7490' },
  grey: { bg: '#f8f7fc', border: '#e2dff0', num: '#5b4a7a' },
};

/**
 * Saralya-style status card: tinted background + matching border, dark label,
 * coloured monospace number, grey helper.
 */
export default function StatusCard({ label, value, helper, color = 'orange', index = 0, onClick, extra }) {
  const t = TINTS[color] || TINTS.grey;
  return (
    <div
      className="card status-card"
      style={{ '--sc-bg': t.bg, '--sc-border': t.border, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <span className="label">{label}</span>
      <span className="status-value" style={{ color: t.num }}>{value}</span>
      {helper && <span className="status-helper">{helper}</span>}
      {extra}
    </div>
  );
}
