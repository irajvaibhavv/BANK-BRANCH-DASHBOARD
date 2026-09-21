import { useMemo, useState } from 'react';

export function useSortableTable(rows, initialKey = null, initialDir = 'desc', pageSize = 20) {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState(initialDir);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const list = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === bv) return 0;
      if (typeof av === 'string') return av.localeCompare(bv);
      return (av ?? -Infinity) - (bv ?? -Infinity);
    });
    return sortDir === 'desc' ? list.reverse() : list;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  return {
    sorted, paged, sortKey, sortDir, toggleSort,
    page: safePage, setPage, totalPages, pageSize, total: sorted.length,
    from: sorted.length ? (safePage - 1) * pageSize + 1 : 0,
    to: Math.min(safePage * pageSize, sorted.length),
  };
}
