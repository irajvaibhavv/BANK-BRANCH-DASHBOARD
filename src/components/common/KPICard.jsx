import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';

const ACCENTS = {
  purple: '#6C5CE7', blue: '#3498DB', green: '#2ECC71', amber: '#F39C12',
  red: '#E74C3C', pink: '#E91E8F', teal: '#1ABC9C', gold: '#F5B301', grey: '#9896AB',
};

/**
 * Saralya-style KPI card: 3px coloured TOP border, uppercase label, monospace big number,
 * "→ helper" line. `delta` (number, %) renders the up/down pill in the corner.
 */
export default function KPICard({ label, value, helper, accent = 'purple', delta, deltaLabel, index = 0, onClick }) {
  const color = ACCENTS[accent] || accent;
  return (
    <div
      className="card kpi-card"
      style={{ borderTopColor: color, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <span className="label">{label}</span>
      <span className="kpi-value">{value}</span>
      {helper && <span className="kpi-helper">→ {helper}</span>}
      {delta !== undefined && delta !== null && (
        <span className={`kpi-delta ${delta >= 0 ? 'up' : 'down'}`} title={deltaLabel || 'vs last period'}>
          {delta >= 0 ? <FiArrowUpRight size={13} /> : <FiArrowDownRight size={13} />}
          {Math.abs(delta).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
