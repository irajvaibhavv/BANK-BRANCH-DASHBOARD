import { useMemo } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';
import { useScope } from '@/scope/useScope';
import { DATA } from '@/scope/scopeHelpers';
import { AREA_NAMES, dsaAreaName } from '@/scope/areas';

/**
 * Branch-level focus filter: narrow the whole page to one area, one branch officer or one DSA.
 * Picking one clears the others (they are alternative ways of slicing the same branch).
 */
export default function FocusBar() {
  const { level, currentScope, focus, setFocus } = useScope();
  // options come from the full branch, not the already-narrowed scope, so the lists never shrink after a pick
  const { officers, dsas, areas } = useMemo(() => {
    const bid = currentScope.branchId;
    const officers = DATA.officers.filter((o) => o.branchId === bid);
    const dsas = DATA.dsas.filter((d) => d.branchId === bid);
    const areas = AREA_NAMES.map((name) => ({ name, n: dsas.filter((d) => dsaAreaName(d) === name).length })).filter((a) => a.n > 0);
    return { officers, dsas, areas };
  }, [currentScope.branchId]);

  if (level !== 'branch') return null;
  const val = (type) => (focus?.type === type ? focus.id : '');
  const pick = (type) => (e) => setFocus(e.target.value ? { type, id: e.target.value } : null);

  return (
    <div className="flex items-center gap-3" style={{ flexWrap: 'wrap', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
      <span className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}><FiFilter size={13} /> Filter by</span>
      <select className="input select" value={val('area')} onChange={pick('area')} style={{ width: 190 }}>
        <option value="">All areas</option>
        {areas.map((a) => <option key={a.name} value={a.name}>{a.name} ({a.n} DSAs)</option>)}
      </select>
      <select className="input select" value={val('officer')} onChange={pick('officer')} style={{ width: 210 }}>
        <option value="">All branch officers</option>
        {officers.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.dsaCount} DSAs)</option>)}
      </select>
      <select className="input select" value={val('dsa')} onChange={pick('dsa')} style={{ width: 240 }}>
        <option value="">All DSAs</option>
        {dsas.map((d) => <option key={d.id} value={d.id}>{d.firm} · {d.officerName.split(' ')[0]}</option>)}
      </select>
      {focus && (
        <button className="chip active" onClick={() => setFocus(null)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <FiX size={13} /> Clear filter
        </button>
      )}
      {!focus && <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>Showing the whole branch</span>}
    </div>
  );
}
