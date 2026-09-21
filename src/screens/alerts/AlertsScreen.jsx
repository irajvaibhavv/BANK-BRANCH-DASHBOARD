import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertOctagon, FiAlertTriangle, FiInfo, FiCheck, FiClock, FiArrowRight, FiSliders } from 'react-icons/fi';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { Card, Badge, Button } from '../../components/common';
import { useScope } from '../../hooks/useScope';
import { useToast } from '../../context/ToastContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { relativeTime, daysAgo } from '../../utils/formatNumber';
import notifications from '../../data/notifications.json';

const SEV = {
  critical: { label: 'Critical', color: 'var(--danger)', icon: FiAlertOctagon, variant: 'danger' },
  warning: { label: 'Warning', color: 'var(--warning)', icon: FiAlertTriangle, variant: 'warning' },
  info: { label: 'Info', color: 'var(--info)', icon: FiInfo, variant: 'info' },
};
const DEFAULT_THRESHOLDS = { targetBelow: 70, dsaInactiveDays: 21, stuckDays: 10, officerIdleDays: 2, rejectionAbove: 25 };

function inScope(n, scope) {
  if (!scope || scope.level === 'national') return true;
  if (scope.branchId) return n.branchId === scope.branchId || (!n.branchId && !n.stateId && !n.regionId);
  if (scope.stateId) return n.stateId === scope.stateId || (!n.stateId && !n.regionId);
  if (scope.regionId) return n.regionId === scope.regionId || !n.regionId;
  return true;
}

export default function AlertsScreen() {
  const { currentScope, goTo } = useScope();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('critical');
  const [state, setState] = useLocalStorage('ff_alert_state', {});
  const [thresholds, setThresholds] = useLocalStorage('ff_alert_thresholds', DEFAULT_THRESHOLDS);
  const [showSettings, setShowSettings] = useState(false);

  const all = useMemo(() => notifications.filter((n) => inScope(n, currentScope)).map((n) => ({ ...n, status: state[n.id]?.status || n.status, snoozedUntil: state[n.id]?.snoozedUntil })), [currentScope, state]);
  const counts = { critical: all.filter((n) => n.severity === 'critical' && n.status === 'open').length, warning: all.filter((n) => n.severity === 'warning' && n.status === 'open').length, info: all.filter((n) => n.severity === 'info' && n.status === 'open').length };
  const list = all.filter((n) => n.severity === tab && n.status !== 'resolved' && !(n.snoozedUntil && n.snoozedUntil > Date.now()));

  const groups = [
    { label: 'Today', items: list.filter((n) => daysAgo(n.time) < 1) },
    { label: 'Yesterday', items: list.filter((n) => daysAgo(n.time) >= 1 && daysAgo(n.time) < 2) },
    { label: 'Earlier', items: list.filter((n) => daysAgo(n.time) >= 2) },
  ].filter((g) => g.items.length);

  const resolve = (n) => { setState((s) => ({ ...s, [n.id]: { status: 'resolved' } })); toast('Alert marked resolved'); };
  const snooze = (n) => { setState((s) => ({ ...s, [n.id]: { ...s[n.id], snoozedUntil: Date.now() + 4 * 3600e3 } })); toast('Snoozed for 4 hours', 'info'); };
  const open = (n) => { if (n.branchId) goTo('branch', n.branchId); else if (n.stateId) goTo('state', n.stateId); else if (n.regionId) goTo('regional', n.regionId); navigate(n.link); };

  return (
    <>
      <Breadcrumb trailing={<Button variant="secondary" size="sm" icon={<FiSliders />} onClick={() => setShowSettings((s) => !s)}>Alert Settings</Button>} />

      {showSettings && (
        <Card title="Alert Thresholds" description="Saved locally in this browser — the rules that raise alerts" className="fade-up">
          <div className="grid grid-5">
            {[['targetBelow', 'Target achievement below', '%'], ['dsaInactiveDays', 'DSA inactive for', 'days'], ['stuckDays', 'File stuck in stage for', 'days'], ['officerIdleDays', 'Officer with no visits for', 'days'], ['rejectionAbove', 'Rejection rate above', '%']].map(([k, l, u]) => (
              <div key={k}>
                <div className="label" style={{ fontSize: 11, marginBottom: 6 }}>{l}</div>
                <div className="flex items-center gap-2"><input type="number" className="input" style={{ width: 90 }} value={thresholds[k]} onChange={(e) => setThresholds({ ...thresholds, [k]: Number(e.target.value) })} /><span className="muted">{u}</span></div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={() => { setShowSettings(false); toast('Thresholds saved'); }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setThresholds(DEFAULT_THRESHOLDS)}>Reset to defaults</Button>
          </div>
        </Card>
      )}

      <Card animate={false}>
        <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {Object.entries(SEV).map(([id, s]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: 'none', border: 'none', padding: '8px 14px 12px', fontSize: 12, fontWeight: 600, color: tab === id ? s.color : 'var(--text-secondary)', borderBottom: `2px solid ${tab === id ? s.color : 'transparent'}`, marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <s.icon /> {s.label} <Badge variant={s.variant}>{counts[id]}</Badge>
            </button>
          ))}
        </div>

        {groups.length === 0 && <p className="muted" style={{ padding: 20, textAlign: 'center' }}>No open {tab} alerts in this scope. 🎉</p>}
        {groups.map((g) => (
          <div key={g.label} style={{ marginBottom: 20 }}>
            <div className="label" style={{ marginBottom: 10 }}>{g.label}</div>
            <AnimatePresence>
              {g.items.map((n) => {
                const s = SEV[n.severity];
                return (
                  <motion.div key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 40 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderLeft: `4px solid ${s.color}`, background: 'var(--card-bg)', border: '1px solid var(--border)', borderLeftWidth: 4, borderLeftColor: s.color, borderRadius: 8, marginBottom: 8 }}>
                    <s.icon size={20} style={{ color: s.color, flexShrink: 0 }} />
                    <div className="flex-1" style={{ cursor: 'pointer' }} onClick={() => open(n)}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{n.message}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{n.source} · {relativeTime(n.time)}</div>
                    </div>
                    <Button variant="secondary" size="sm" icon={<FiClock />} onClick={() => snooze(n)}>Snooze</Button>
                    <Button variant="secondary" size="sm" icon={<FiCheck />} onClick={() => resolve(n)}>Mark Resolved</Button>
                    <button className="btn-icon" onClick={() => open(n)} title="Go to source"><FiArrowRight /></button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </Card>
    </>
  );
}
