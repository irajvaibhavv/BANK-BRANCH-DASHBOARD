import { NavLink } from 'react-router-dom';
import { BRAND } from '@/config/brand';
import { FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import { useState } from "react";
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/shared/context/ThemeContext';
import { Avatar, Toggle } from '@/shared/ui';
import notifications from '@/data/notifications.json';

/** Emoji icons — each item has its own colour, like the Saralya sidebar */
export const NAV = [
  { to: '/overview', label: 'Overview', icon: '📊', sub: true },
  { to: '/drilldown', label: 'Branch Performance', icon: '🎯', sub: true },
  { to: '/activity', label: 'Officer Activity', icon: '🏃', sub: true },
  { to: '/map', label: 'Map View', icon: '🗺️', sub: true },
  { to: '/dsa', label: 'DSA Network', icon: '👥', sub: true },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏆', sub: true },
  { to: '/pipeline', label: 'Loan Pipeline', icon: '🔀', sub: true },
  { to: '/incentives', label: 'Incentives', icon: '💰', sub: true },
  { to: '/reports', label: 'Reports', icon: '📈', sub: true },
  { to: '/alerts', label: 'Alerts', icon: '⚠️', sub: true, badge: true },
];

const ROLE_LABEL = { national: 'National Head', regional: 'Regional Head', state: 'State Head', branch: 'Branch Head' };

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const { prefs, setPref, isDark, toggleTheme } = useTheme();
  const [expandAll, setExpandAll] = useState(false);
  const unread = notifications.filter((n) => n.status === 'open' && n.severity === 'critical').length;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <span className="mark">🏦</span>
        <div><div className="brand-name">{BRAND.name}</div><div className="brand-sub">{BRAND.sub}</div></div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon, sub, badge }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? label : undefined}>
            <span className="ic emoji">{icon}</span>
            <span className="lbl">{label}</span>
            {badge && unread > 0 && <span className="nav-badge">{unread}</span>}
            {sub && <span className="arrow">{expandAll ? "▼" : "▶"}</span>}
          </NavLink>
        ))}
        <div className="sidebar-divider" />
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? 'Settings' : undefined}>
          <span className="ic emoji">⚙️</span>
          <span className="lbl">Settings</span>
          <span className="arrow">▶</span>
        </NavLink>
      </nav>

      <button className="sidebar-expand" onClick={() => setExpandAll((e) => !e)}>{expandAll ? "Collapse All" : "Expand All"}</button>
      <button className="sidebar-collapse" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? <FiChevronsRight size={16} /> : <FiChevronsLeft size={16} />}
        <span>Collapse</span>
      </button>

      <div className="sidebar-toggles">
        <div className="trow"><span>Extended</span><Toggle on={!!prefs.extendedFeatures} onChange={(v) => setPref('extendedFeatures', v)} /></div>
        <div className="trow"><span>Dark Mode</span><Toggle on={isDark} onChange={toggleTheme} /></div>
      </div>

      <div className="sidebar-user">
        <Avatar name={user?.name || 'FF'} size={44} />
        <div className="meta">
          <div className="uname">{user?.name}</div>
          <div className="usub">{ROLE_LABEL[user?.role] || 'User'}</div>
        </div>
      </div>
    </aside>
  );
}
