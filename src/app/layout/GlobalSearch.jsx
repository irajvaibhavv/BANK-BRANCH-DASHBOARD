import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiCornerDownLeft } from 'react-icons/fi';
import { Modal } from '@/shared/ui';
import { globalSearch } from '@/shared/hooks/useSearch';
import { useScope } from '@/scope/useScope';

export default function GlobalSearch({ open, onClose }) {
  const [q, setQ] = useState('');
  const ref = useRef();
  const navigate = useNavigate();
  const { goTo } = useScope();
  const groups = globalSearch(q);

  useEffect(() => { if (open) { setQ(''); setTimeout(() => ref.current?.focus(), 50); } }, [open]);

  const pick = (item) => {
    goTo(item.level, item.id);
    navigate(item.route);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <FiSearch size={18} style={{ color: 'var(--text-muted)' }} />
        <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search branches, officers, DSAs, loan files..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: 'var(--text-primary)' }} />
        <span className="kbd">ESC</span>
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: 8 }}>
        {!q && <div className="muted" style={{ padding: 16 }}>Type to search across 42 branches, 257 officers, 380 DSAs and 760 loan files.</div>}
        {q && !groups.length && <div className="muted" style={{ padding: 16 }}>No results for “{q}”.</div>}
        {groups.map((g) => (
          <div key={g.type} style={{ padding: '6px 0' }}>
            <div className="label" style={{ padding: '6px 10px', fontSize: 10.5 }}>{g.type}</div>
            {g.items.map((it, i) => (
              <button key={g.type + i} onClick={() => pick(it)}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{it.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{it.sub}</div>
                </div>
                <FiCornerDownLeft size={13} style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}
