import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiBarChart2, FiList, FiSearch, FiX, FiInbox, FiDownload } from 'react-icons/fi';
import { initials as toInitials } from '../../utils/formatNumber';

export { default as Card } from './Card';
export { default as KPICard } from './KPICard';
export { default as StatusCard } from './StatusCard';

/* ---------- Badge ---------- */
export function Badge({ variant = 'neutral', children, dot, style }) {
  return (
    <span className={`badge badge-${variant}`} style={style}>
      {dot && <span className="dot" style={{ background: 'currentColor', width: 6, height: 6 }} />}
      {children}
    </span>
  );
}

/* ---------- Button ---------- */
export function Button({ variant = 'primary', size, icon, children, className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} {...rest}>
      {icon}{children}
    </button>
  );
}

export function IconButton({ title, children, ...rest }) {
  return <button className="btn-icon" title={title} aria-label={title} {...rest}>{children}</button>;
}

/* ---------- Pill toggle ---------- */
export function PillToggle({ options, value, onChange, size }) {
  return (
    <div className="pill-group">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { id: o, label: o } : o;
        return (
          <button key={opt.id} className={`pill ${value === opt.id ? 'active' : ''}`} onClick={() => onChange(opt.id)} style={size === 'sm' ? { height: 26, padding: '0 10px', fontSize: 11 } : undefined}>
            {opt.icon}{opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Chart / Table toggle ---------- */
export function ChartTableToggle({ value, onChange }) {
  return (
    <div className="seg-toggle">
      <button className={value === 'chart' ? 'active' : ''} onClick={() => onChange('chart')}><FiBarChart2 /> Chart</button>
      <button className={value === 'table' ? 'active' : ''} onClick={() => onChange('table')}><FiList /> Table</button>
    </div>
  );
}

/* ---------- Segmented (generic) ---------- */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg-toggle">
      {options.map((o) => (
        <button key={o.id} className={value === o.id ? 'active' : ''} onClick={() => onChange(o.id)}>{o.icon}{o.label}</button>
      ))}
    </div>
  );
}

/* ---------- Search input ---------- */
export function SearchBar({ value, onChange, placeholder = 'Search...', style }) {
  return (
    <div className="input-search" style={style}>
      <FiSearch />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => onChange('')}><FiX size={13} /></button>}
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, size = 32, color, style }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: color, ...style }}>
      {toInitials(name)}
    </span>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, children, width }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div className="modal" style={{ width }} initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} onMouseDown={(e) => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Skeleton / Empty ---------- */
export function Skeleton({ h = 16, w = '100%', style }) {
  return <div className="skeleton" style={{ height: h, width: w, ...style }} />;
}

export function EmptyState({ text = 'Nothing to show for this scope', icon }) {
  return (
    <div className="empty-state">
      {icon || <FiInbox />}
      <div>{text}</div>
    </div>
  );
}

/* ---------- Export button (prototype: toast) ---------- */
export function ExportButton({ onExport, label = 'Export', size = 'sm', variant = 'ghost' }) {
  return <Button variant={variant} size={size} icon={<FiDownload />} onClick={onExport}>{label}</Button>;
}

/* ---------- Section heading ---------- */
export function SectionHeading({ title, description, actions }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
      <div>
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-desc">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/* ---------- Trend arrow ---------- */
export function Trend({ value, suffix = '%' }) {
  if (value === undefined || value === null) return <span className="muted">—</span>;
  const up = value >= 0;
  return (
    <span style={{ color: up ? '#15803d' : '#b91c1c', fontWeight: 600, fontSize: 12 }} className="num">
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

/* ---------- Toggle switch ---------- */
export function Toggle({ on, onChange }) {
  return <button className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} />;
}

/* ---------- Tooltip (simple title-based wrapper) ---------- */
export function Tooltip({ text, children }) {
  return <span title={text} style={{ display: 'inline-flex' }}>{children}</span>;
}
