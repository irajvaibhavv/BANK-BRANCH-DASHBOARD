import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiDownload } from 'react-icons/fi';
import { FaFire, FaMedal } from 'react-icons/fa';
import Breadcrumb from '@/scope/Breadcrumb';
import { Card, PillToggle, Avatar, Badge, Trend, Button } from '@/shared/ui';
import { DataTable, Pagination } from '@/shared/ui/DataTable';
import { useScope } from '@/scope/useScope';
import { useSortableTable } from '@/shared/hooks/useSortableTable';
import { useToast } from '@/shared/context/ToastContext';
import { formatCurrency, formatIndian } from '@/shared/utils/formatCurrency';
import { perfClass } from '@/shared/utils/performanceColor';
import { CHILD_LABEL, DATA } from '@/scope/scopeHelpers';

const METRICS = [
  { id: 'disbursement', label: 'Disbursement', key: 'monthlyDisbursement', fmt: (v) => formatCurrency(v) },
  { id: 'files', label: 'Files', key: 'filesSubmitted', fmt: (v) => formatIndian(v) },
  { id: 'visits', label: 'Visits', key: 'visits', fmt: (v) => formatIndian(v) },
  { id: 'dsa', label: 'DSA Growth', key: 'newDsasThisMonth', fmt: (v) => `+${v}` },
  { id: 'target', label: 'Target %', key: 'targetPct', fmt: (v) => `${v.toFixed(1)}%` },
];
const PERIODS = [{ id: 'week', label: 'This Week', f: 0.25 }, { id: 'month', label: 'This Month', f: 1 }, { id: 'quarter', label: 'This Quarter', f: 3 }];
const VIEWS = [{ id: 'top', label: 'Top Performers' }, { id: 'bottom', label: 'Bottom Performers' }, { id: 'all', label: 'All' }];
const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function LeaderboardScreen() {
  const { children, level, userJurisdiction, rootScope } = useScope();
  const toast = useToast();
  const [metric, setMetric] = useState('disbursement');
  const [period, setPeriod] = useState('month');
  const [view, setView] = useState('top');
  const m = METRICS.find((x) => x.id === metric);
  const p = PERIODS.find((x) => x.id === period);

  const rows = useMemo(() => {
    const scaleKeys = ['monthlyDisbursement', 'filesSubmitted', 'visits'];
    const list = children.map((u) => {
      const officers = u.level === 'officer' ? [u.raw] : DATA.officers.filter((o) => (u.level === 'branch' ? o.branchId === u.id : u.level === 'state' ? o.stateId === u.id : o.regionId === u.id));
      const visits = officers.reduce((a, o) => a + o.visitsWeek, 0) * 4;
      const base = { ...u, visits };
      const value = scaleKeys.includes(m.key) ? Math.round(base[m.key] * p.f) : base[m.key];
      const prev = u.trend[4] || 1, curr = u.trend[5] || 1;
      const change = ((curr - prev) / prev) * 100;
      const streak = u.raw?.streakMonths ?? (u.raw?.rankHistory ? u.raw.rankHistory.filter((r) => r <= 3).length : Math.max(0, Math.round(u.targetPct / 40) - 1));
      return { ...base, value, change, streak };
    });
    let sorted = [...list].sort((a, b) => b.value - a.value).map((r, i) => ({ ...r, rank: i + 1 }));
    if (view === 'top') sorted = sorted.slice(0, 10);
    if (view === 'bottom') sorted = sorted.slice(-10).reverse();
    return sorted;
  }, [children, m, p, view]);

  const podium = useMemo(() => [...children].map((u) => ({ ...u })).sort((a, b) => b[m.key === 'visits' ? 'monthlyDisbursement' : m.key] - a[m.key === 'visits' ? 'monthlyDisbursement' : m.key]).slice(0, 3), [children, m]);
  const table = useSortableTable(rows, 'rank', 'asc', 20);

  const mostImproved = [...rows].sort((a, b) => b.change - a.change)[0];
  const longestStreak = [...rows].sort((a, b) => b.streak - a.streak)[0];
  const mine = (r) => r.id === userJurisdiction.branchId || r.id === userJurisdiction.stateId || r.id === userJurisdiction.regionId;

  const columns = [
    { key: 'rank', label: 'Rank', width: 70, render: (r) => r.rank <= 3 ? <FaMedal style={{ color: MEDAL[r.rank - 1], fontSize: 18 }} /> : <span className="rank">{r.rank}</span> },
    { key: 'name', label: 'Name', strong: true, render: (r) => <div className="flex items-center gap-3"><Avatar name={r.name} size={28} />{r.name}{mine(r) && <Badge variant="brand">You</Badge>}</div> },
    { key: 'location', label: 'Location' },
    { key: 'value', label: m.label, align: 'right', num: true, strong: true, render: (r) => m.id === 'target' ? <span className={perfClass(r.value)}>{m.fmt(r.value)}</span> : m.fmt(r.value) },
    { key: 'change', label: 'Change', align: 'right', render: (r) => <Trend value={r.change} /> },
    { key: 'streak', label: 'Streak', align: 'right', render: (r) => r.streak > 0 ? <span className="badge badge-warning"><FaFire /> {r.streak} mo</span> : <span className="muted">—</span> },
  ];

  return (
    <>
      <Breadcrumb />

      <div className="grid grid-2">
        <Card className="fade-up" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="flex items-center gap-3">
            <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--success-tint)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}><FiTrendingUp /></span>
            <div>
              <div className="label">Most Improved</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{mostImproved?.name || '—'} {mostImproved && <span className="text-success">(+{mostImproved.change.toFixed(0)}% vs last month)</span>}</div>
            </div>
          </div>
        </Card>
        <Card className="fade-up" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="flex items-center gap-3">
            <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--warning-tint)', color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}><FaFire /></span>
            <div>
              <div className="label">Longest Streak</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{longestStreak?.name || '—'} {longestStreak && <span className="text-warning">(#1 for {Math.max(1, longestStreak.streak)} month{longestStreak.streak > 1 ? 's' : ''})</span>}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Podium */}
      <Card animate={false} style={{ background: 'linear-gradient(180deg, var(--brand-tint) 0%, var(--card-bg) 70%)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <div><h3 className="section-title">Podium — {CHILD_LABEL[level]}</h3><p className="section-desc">Ranked by {m.label.toLowerCase()} · {p.label.toLowerCase()}</p></div>
          <PillToggle size="sm" options={METRICS} value={metric} onChange={setMetric} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 20, padding: '20px 0 0' }}>
          {[1, 0, 2].map((idx) => {
            const u = podium[idx];
            if (!u) return <div key={idx} style={{ width: 200 }} />;
            const h = idx === 0 ? 150 : idx === 1 ? 110 : 84;
            const key = m.key === 'visits' ? 'monthlyDisbursement' : m.key;
            return (
              <motion.div key={u.id} style={{ width: 200, textAlign: 'center' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                <Avatar name={u.name} size={idx === 0 ? 60 : 48} color={MEDAL[idx]} style={{ margin: '0 auto 8px', border: `3px solid ${MEDAL[idx]}`, color: '#1A1A2E' }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{u.location}</div>
                <div className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand)', margin: '4px 0 10px' }}>{m.id === 'visits' ? formatCurrency(u.monthlyDisbursement) : m.fmt(u[key])}</div>
                <div style={{ height: h, borderRadius: '8px 8px 0 0', background: `linear-gradient(180deg, ${MEDAL[idx]} 0%, ${MEDAL[idx]}88 100%)`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 12, fontSize: 28, fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>{idx + 1}</div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      <Card animate={false} title="Rankings" description={`${rows.length} ${CHILD_LABEL[level]?.toLowerCase()} · your unit is highlighted`}
        actions={<Button variant="ghost" size="sm" icon={<FiDownload />} onClick={() => toast('Leaderboard exported (prototype)')}>Export</Button>}>
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <PillToggle options={PERIODS} value={period} onChange={setPeriod} />
          <span className="spacer" />
          <PillToggle options={VIEWS} value={view} onChange={setView} />
        </div>
        <DataTable columns={columns} rows={table.paged} sort={table} rowClass={(r) => (mine(r) ? 'highlight' : '')} />
        <Pagination table={table} />
        {rootScope.level === 'branch' && <p className="muted mt-2">Officer rankings within your branch.</p>}
      </Card>
    </>
  );
}
