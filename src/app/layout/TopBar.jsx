import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiKey, FiPower, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import { useAuth } from '@/features/auth/AuthContext';
import { useScope } from '@/scope/useScope';
import { useDateRange, DATE_RANGES } from '@/shared/context/DateRangeContext';
import { useToast } from '@/shared/context/ToastContext';
import { Avatar, PillToggle } from '@/shared/ui';
import GlobalSearch from '@/app/layout/GlobalSearch';
import { NAV } from '@/app/layout/Sidebar';

export default function TopBar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { scopeLabel } = useScope();
  const { rangeId, setRangeId, custom, setCustom } = useDateRange();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showRange, setShowRange] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [tick, setTick] = useState(0);

  const title = NAV.find((n) => location.pathname.startsWith(n.to))?.label || (location.pathname.startsWith('/settings') ? 'Settings' : 'Dashboard');

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', h);
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => { window.removeEventListener('keydown', h); clearInterval(t); };
  }, []);

  const mins = Math.floor((Date.now() - updatedAt) / 60000);
  const updatedLabel = mins < 1 ? 'just now' : `${mins} min ago`;

  return (
    <>
      <header className="topbar">
        <button className="btn-icon" onClick={onToggleSidebar} title="Toggle sidebar"><FiMenu size={18} /></button>
        <div className="topbar-title">{title}</div>

        <div className="topbar-search" onClick={() => setSearchOpen(true)} role="button" tabIndex={0}>
          <span style={{ fontSize: 13 }}>🔍</span>
          <span className="ph">Search branches, officers, DSAs, loan files...</span>
          <span className="kbd">⌘K</span>
        </div>

        <div className="topbar-right">
          <div style={{ position: 'relative' }}>
            <button className={`pill ${showRange ? 'active' : ''}`} onClick={() => setShowRange((s) => !s)} style={{ height: 34 }}>
              <FiCalendar size={13} /> {DATE_RANGES.find((r) => r.id === rangeId)?.label}
            </button>
            {showRange && (
              <div className="card" style={{ position: 'absolute', top: 42, right: 0, zIndex: 60, width: 420, padding: 14, boxShadow: 'var(--shadow-panel)' }}>
                <div className="label" style={{ marginBottom: 10 }}>Date range · applies to all screens</div>
                <PillToggle options={DATE_RANGES} value={rangeId} onChange={(id) => { setRangeId(id); if (id !== 'custom') setShowRange(false); }} size="sm" />
                {rangeId === 'custom' && (
                  <div className="flex gap-2 mt-4 items-center">
                    <input type="date" className="input" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
                    <span className="muted">to</span>
                    <input type="date" className="input" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
                    <button className="btn btn-primary btn-sm" onClick={() => setShowRange(false)}>Apply</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="topbar-updated" key={tick} title={scopeLabel}>
            <span className="live pulse" /><span className="txt">Updated {updatedLabel}</span>
            <button className="btn-icon" style={{ width: 26, height: 26 }} title="Refresh" onClick={() => { setUpdatedAt(Date.now()); toast('Data refreshed', 'info'); }}><FiRefreshCw size={13} /></button>
          </div>

          <div className="topbar-user">
            <Avatar name={user?.name || 'FF'} size={32} />
            <div>
              <div className="name">{user?.name}</div>
              <div className="role">{user?.roleLabel}</div>
            </div>
          </div>
          <button className="topbar-round" title="Settings & access" onClick={() => navigate('/settings')}><FiKey size={16} style={{ color: '#D97706' }} /></button>
          <button className="topbar-round" title="Logout" onClick={() => { logout(); navigate('/login'); }}><FiPower size={16} /></button>
        </div>
      </header>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
