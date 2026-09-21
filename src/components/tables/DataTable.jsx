import { FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { EmptyState } from '../common';

/**
 * Generic table.
 * columns: [{ key, label, render?(row), sortable?, align?, width? }]
 * sort: { sortKey, sortDir, toggleSort } from useSortableTable
 */
export function DataTable({ columns, rows, sort, onRowClick, rowClass, rowKey = 'id', compact, emptyText }) {
  return (
    <div className="table-wrap">
      <table className={`table ${compact ? 'compact' : ''}`}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`${c.sortable !== false && sort ? 'sortable' : ''} ${c.align === 'right' ? 'td-right' : ''}`} style={{ width: c.width }}
                onClick={() => c.sortable !== false && sort?.toggleSort(c.key)}>
                {c.label}
                {sort && sort.sortKey === c.key && <span className="sort-ic">{sort.sortDir === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length}><EmptyState text={emptyText} /></td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={r[rowKey] ?? i} className={`${onRowClick ? 'clickable' : ''} ${rowClass?.(r) || ''}`} onClick={() => onRowClick?.(r)}>
              {columns.map((c) => (
                <td key={c.key} className={`${c.align === 'right' ? 'td-right' : ''} ${c.strong ? 'td-strong' : ''} ${c.num ? 'num' : ''}`}>
                  {c.render ? c.render(r, i) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ table }) {
  const { page, setPage, totalPages, from, to, total } = table;
  if (total === 0) return null;
  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) pages.push(p);
  return (
    <div className="pagination">
      <span>Showing {from}–{to} of {total}</span>
      <div className="pages">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}><FiChevronLeft size={14} /></button>
        {pages[0] > 1 && <><button onClick={() => setPage(1)}>1</button>{pages[0] > 2 && <span style={{ padding: '0 4px', lineHeight: '30px' }}>…</span>}</>}
        {pages.map((p) => <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>)}
        {pages[pages.length - 1] < totalPages && <><span style={{ padding: '0 4px', lineHeight: '30px' }}>…</span><button onClick={() => setPage(totalPages)}>{totalPages}</button></>}
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}><FiChevronRight size={14} /></button>
      </div>
    </div>
  );
}

export function FilterChips({ options, value, onChange }) {
  return (
    <div className="pill-group">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { id: o, label: o } : o;
        return (
          <button key={opt.id} className={`pill ${value === opt.id ? 'active' : ''}`} onClick={() => onChange(opt.id)}>
            {opt.label}{opt.count !== undefined && <span style={{ opacity: 0.7, fontSize: 10.5 }}>({opt.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
