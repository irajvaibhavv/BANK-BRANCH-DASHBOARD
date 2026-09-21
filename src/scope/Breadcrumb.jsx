import { FiChevronRight, FiHome, FiArrowUp, FiX, FiFilter } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useScope } from '@/scope/useScope';

/** Always-visible drill-down breadcrumb. Each level is clickable; last one is bold. */
export default function Breadcrumb({ trailing }) {
  const { breadcrumbs, goTo, canDrillUp, drillUp, focus, focusLabel, setFocus } = useScope();
  return (
    <div className="flex items-center justify-between" style={{ minHeight: 28 }}>
      <nav className="breadcrumb">
        <FiHome size={13} />
        <AnimatePresence initial={false}>
          {breadcrumbs.map((c, i) => {
            const last = i === breadcrumbs.length - 1;
            return (
              <motion.span key={c.level + c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.18 }}>
                {i > 0 && <span className="sep"><FiChevronRight size={13} /></span>}
                {last ? <span className="current">{c.label}</span> : <button onClick={() => goTo(c.level, c.id)}>{c.label}</button>}
              </motion.span>
            );
          })}
        </AnimatePresence>
        {focus && (
          <span className="badge badge-brand" style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <FiFilter size={11} /> {focus.type === 'area' ? 'Area' : focus.type === 'officer' ? 'BO' : 'DSA'}: {focusLabel}
            <button onClick={() => setFocus(null)} title="Clear filter" style={{ display: 'inline-flex', color: 'inherit', marginLeft: 2 }}><FiX size={12} /></button>
          </span>
        )}
        {canDrillUp && (
          <button onClick={drillUp} style={{ marginLeft: 8, color: 'var(--brand)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FiArrowUp size={12} /> Up one level
          </button>
        )}
      </nav>
      {trailing}
    </div>
  );
}
