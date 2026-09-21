import { useMemo, useState } from 'react';
import { DATA } from '../utils/scopeHelpers';

/** Simple text filter over rows for the given keys */
export function useSearch(rows, keys) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, keys, query]);
  return { query, setQuery, filtered };
}

/** Global search across every entity type, grouped */
export function globalSearch(query, limit = 5) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const m = (s) => String(s || '').toLowerCase().includes(q);
  const groups = [
    { type: 'Branches', items: DATA.branches.filter((b) => m(b.name) || m(b.city)).slice(0, limit).map((b) => ({ id: b.id, title: b.name, sub: `${b.city} · ${DATA.states.find((s) => s.id === b.stateId)?.name}`, level: 'branch', route: '/drilldown' })) },
    { type: 'Officers', items: DATA.officers.filter((o) => m(o.name) || m(o.branchName)).slice(0, limit).map((o) => ({ id: o.id, title: o.name, sub: `${o.branchName} · Branch Officer`, level: 'officer', route: '/drilldown' })) },
    { type: 'DSAs', items: DATA.dsas.filter((d) => m(d.firm) || m(d.name)).slice(0, limit).map((d) => ({ id: d.branchId, title: d.firm, sub: `${d.name} · ${d.branchName}`, level: 'branch', route: '/dsa' })) },
    { type: 'Loan Files', items: DATA.loanFiles.filter((f) => m(f.id) || m(f.borrower)).slice(0, limit).map((f) => ({ id: f.branchId, title: `${f.id} · ${f.borrower}`, sub: `${f.loanType} · ${f.branchName} · ${f.stage}`, level: 'branch', route: '/pipeline' })) },
    { type: 'States', items: DATA.states.filter((s) => m(s.name)).slice(0, limit).map((s) => ({ id: s.id, title: s.name, sub: DATA.regions.find((r) => r.id === s.regionId)?.name, level: 'state', route: '/drilldown' })) },
  ];
  return groups.filter((g) => g.items.length);
}
