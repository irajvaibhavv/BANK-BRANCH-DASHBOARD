import { useState } from 'react';
import { BRAND } from '../../config/brand';
import { FiPhone, FiMail, FiUserPlus, FiMoon, FiSun } from 'react-icons/fi';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { Card, Avatar, Badge, Button, Toggle, PillToggle, Modal } from '../../components/common';
import { DataTable } from '../../components/tables/DataTable';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useScope } from '../../hooks/useScope';
import { useToast } from '../../context/ToastContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DATE_RANGES } from '../../context/DateRangeContext';
import { scopeSummary, DATA } from '../../utils/scopeHelpers';
import { relativeTime } from '../../utils/formatNumber';
import users from '../../data/users.json';
import { NAV } from '../../components/layout/Sidebar';

const ROLE_LABEL = { national: 'National Business Head', regional: 'Regional Head', state: 'State Head', branch: 'Branch Head' };

export default function SettingsProfile() {
  const { user } = useAuth();
  const { isDark, toggleTheme, prefs, setPref } = useTheme();
  const { rootScope } = useScope();
  const toast = useToast();
  const [extraUsers, setExtraUsers] = useLocalStorage('ff_extra_users', []);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'branch', jurisdiction: '' });

  const seeded = [
    ...users.map((u, i) => ({ id: u.id, name: u.name, role: ROLE_LABEL[u.role], jurisdiction: u.role === 'national' ? 'All India' : u.roleLabel.split('· ')[1], status: 'Active', lastLogin: new Date(Date.now() - (i + 1) * 3.2e6).toISOString() })),
    ...DATA.states.slice(0, 6).map((s, i) => ({ id: `S${s.id}`, name: s.head, role: 'State Head', jurisdiction: s.name, status: i === 4 ? 'Inactive' : 'Active', lastLogin: new Date(Date.now() - (i + 2) * 1.8e7).toISOString() })),
  ];
  const allUsers = [...extraUsers, ...seeded];

  const addUser = () => {
    if (!form.name.trim()) return toast('Name is required', 'info');
    setExtraUsers([{ id: `U${Date.now()}`, name: form.name, role: ROLE_LABEL[form.role], jurisdiction: form.jurisdiction || 'Unassigned', status: 'Invited', lastLogin: null }, ...extraUsers]);
    setShowAdd(false); setForm({ name: '', role: 'branch', jurisdiction: '' }); toast('User added (local only)');
  };

  const columns = [
    { key: 'name', label: 'Name', strong: true, render: (u) => <div className="flex items-center gap-2"><Avatar name={u.name} size={28} />{u.name}</div> },
    { key: 'role', label: 'Role' },
    { key: 'jurisdiction', label: 'Jurisdiction' },
    { key: 'status', label: 'Status', render: (u) => <Badge variant={u.status === 'Active' ? 'success' : u.status === 'Invited' ? 'info' : 'neutral'} dot>{u.status}</Badge> },
    { key: 'lastLogin', label: 'Last Login', render: (u) => (u.lastLogin ? relativeTime(u.lastLogin) : '—') },
  ];

  return (
    <>
      <Breadcrumb />
      <div className="grid grid-1-2">
        <Card title="Profile">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size={64} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
              <Badge variant="brand">{ROLE_LABEL[user.role]}</Badge>
            </div>
          </div>
          <div className="divider" />
          <div className="flex-col gap-2" style={{ fontSize: 12 }}>
            <span className="flex items-center gap-2"><FiPhone size={13} style={{ color: 'var(--text-muted)' }} /> +91 {user.phone}</span>
            <span className="flex items-center gap-2"><FiMail size={13} style={{ color: 'var(--text-muted)' }} /> {user.name.toLowerCase().replace(/ /g, '.')}@{BRAND.emailDomain}</span>
          </div>
          <div className="divider" />
          <div className="label" style={{ marginBottom: 6 }}>Managing</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user.role === 'national' ? 'All India' : user.roleLabel.split('· ')[1]}</div>
          <div className="muted">{scopeSummary(rootScope)}</div>
        </Card>

        <Card title="Preferences" description="Stored in this browser">
          <div className="flex-col" style={{ gap: 18 }}>
            <PrefRow label="Dark mode" desc="Switch the whole dashboard to a dark theme"><div className="flex items-center gap-2">{isDark ? <FiMoon /> : <FiSun />}<Toggle on={isDark} onChange={toggleTheme} /></div></PrefRow>
            <PrefRow label="Default date range" desc="Applied when you sign in"><PillToggle size="sm" options={DATE_RANGES.filter((r) => r.id !== 'custom')} value={prefs.defaultRange} onChange={(v) => setPref('defaultRange', v)} /></PrefRow>
            <PrefRow label="Layout density" desc="Compact reduces card padding and row height"><PillToggle size="sm" options={[{ id: 'spacious', label: 'Spacious' }, { id: 'compact', label: 'Compact' }]} value={prefs.layout} onChange={(v) => setPref('layout', v)} /></PrefRow>
            <PrefRow label="Default landing screen" desc="First screen after login">
              <select className="input select" value={prefs.landing} onChange={(e) => setPref('landing', e.target.value)}>{NAV.map((n) => <option key={n.to} value={n.to}>{n.label}</option>)}</select>
            </PrefRow>
            <PrefRow label="Extended features" desc="Show Smart Insights bar and gamification cards"><Toggle on={!!prefs.extendedFeatures} onChange={(v) => setPref('extendedFeatures', v)} /></PrefRow>
          </div>
        </Card>
      </div>

      <Card animate={false} title="User Management" description="View only — additions are saved locally" actions={<Button size="sm" icon={<FiUserPlus />} onClick={() => setShowAdd(true)}>Add User</Button>}>
        <DataTable columns={columns} rows={allUsers} compact />
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} width={460}>
        <div style={{ padding: 22 }}>
          <h3 className="section-title" style={{ marginBottom: 16 }}>Add user</h3>
          <div className="flex-col gap-3">
            <div><div className="label" style={{ marginBottom: 6 }}>Full name</div><input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Anjali Gupta" /></div>
            <div><div className="label" style={{ marginBottom: 6 }}>Role</div><select className="input select w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><div className="label" style={{ marginBottom: 6 }}>Jurisdiction</div><input className="input w-full" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} placeholder="e.g. Uttar Pradesh / Lucknow Main" /></div>
          </div>
          <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addUser}>Add user</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function PrefRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div><div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div><div className="muted" style={{ fontSize: 12 }}>{desc}</div></div>
      {children}
    </div>
  );
}
