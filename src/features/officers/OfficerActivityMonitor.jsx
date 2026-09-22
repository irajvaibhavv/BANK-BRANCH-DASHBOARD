import { useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import Breadcrumb from '@/scope/Breadcrumb';
import { Card, KPICard, Badge, SearchBar, Button, Avatar } from '@/shared/ui';
import { DataTable, Pagination, FilterChips } from '@/shared/ui/DataTable';
import OfficerDetailPanel from '@/features/officers/OfficerDetailPanel';
import { OfficerProductivityTable } from '@/features/officers/OfficerProductivityTable';
import { BarChart, HeatMap, ChartLegend } from '@/shared/charts';
import { useScope } from '@/scope/useScope';
import { useSortableTable } from '@/shared/hooks/useSortableTable';
import { useToast } from '@/shared/context/ToastContext';
import { formatIndian } from '@/shared/utils/formatCurrency';
import { relativeTime } from '@/shared/utils/formatNumber';
import { perfClass } from '@/shared/utils/performanceColor';
import { COLORS } from '@/shared/utils/colors';

const STATUS_VARIANT = { Active: 'success', Idle: 'warning', Inactive: 'danger' };
const HOURS = Array.from({ length: 11 }, (_, i) => 9 + i); // 9 → 19
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// deterministic pseudo-random from a string
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export default function OfficerActivityMonitor() {
  const { officers, level } = useScope();
  const toast = useToast();
  const [status, setStatus] = useState('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const kpi = useMemo(() => {
    const n = officers.length || 1;
    return {
      total: officers.length,
      activeToday: officers.filter((o) => o.visitsToday > 0).length,
      meeting: officers.filter((o) => o.visitsWeek >= o.visitTarget * 5).length,
      avgVisits: officers.reduce((a, o) => a + o.avgDailyVisits, 0) / n,
      avgField: officers.reduce((a, o) => a + o.fieldHoursToday, 0) / n,
    };
  }, [officers]);

  const rows = useMemo(() => {
    let r = officers.map((o) => ({ ...o, visitPct: Math.round((o.visitsWeek / (o.visitTarget * 5)) * 100) }));
    if (status !== 'All') r = r.filter((o) => o.status === status);
    const q = query.toLowerCase();
    if (q) r = r.filter((o) => o.name.toLowerCase().includes(q) || o.branchName.toLowerCase().includes(q));
    return r;
  }, [officers, status, query]);
  const table = useSortableTable(rows, 'visitsToday', 'desc', 15);

  // visit compliance over 30 days
  const compliance = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date(2026, 7, 20 + i);
    const base = 55 + Math.sin(i / 3) * 12 + (i % 7 === 6 ? -25 : 0) + ((hash(String(i)) % 15) - 7);
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, pct: Math.max(20, Math.min(98, Math.round(base))) };
  }), []);

  // heat map: day × hour visit density
  const heat = useMemo(() => DAYS.map((d, di) => HOURS.map((h) => {
    const peak = Math.exp(-((h - 11.5) ** 2) / 6) + 0.7 * Math.exp(-((h - 16) ** 2) / 5);
    return Math.round(peak * (di === 5 ? 0.45 : 1) * officers.length * 0.6 + (hash(d + h) % 5));
  })), [officers.length]);
  const columns = [
    { key: 'name', label: 'Officer', strong: true, render: (o) => <div className="flex items-center gap-2"><Avatar name={o.name} size={28} />{o.name}</div> },
    { key: 'branchName', label: 'Branch' },
    { key: 'visitsToday', label: 'Visits Today', align: 'right', num: true },
    { key: 'visitsWeek', label: 'Visits This Week', align: 'right', num: true },
    { key: 'visitPct', label: 'Target %', align: 'right', num: true, render: (o) => <span className={perfClass(o.visitPct)} style={{ fontWeight: 700 }}>{o.visitPct}%</span> },
    { key: 'dsasMet', label: 'DSAs Met', align: 'right', num: true },
    { key: 'lastVisit', label: 'Last Visit', render: (o) => relativeTime(o.lastVisit) },
    { key: 'status', label: 'Status', render: (o) => <Badge variant={STATUS_VARIANT[o.status]} dot>{o.status}</Badge> },
  ];

  return (
    <>
      <Breadcrumb />
      <div className="grid grid-5">
        <KPICard index={0} accent="purple" label="Total Officers" value={formatIndian(kpi.total)} helper="In current scope" />
        <KPICard index={1} accent="green" label="Active Today" value={formatIndian(kpi.activeToday)} helper={`${kpi.total ? Math.round((kpi.activeToday / kpi.total) * 100) : 0}% logged a visit`} />
        <KPICard index={2} accent="blue" label="Meeting Target" value={formatIndian(kpi.meeting)} helper="≥ 30 visits this week" />
        <KPICard index={3} accent="amber" label="Avg Visits / Day" value={kpi.avgVisits.toFixed(1)} helper="Target: 6 per day" />
        <KPICard index={4} accent="teal" label="Avg Field Time" value={`${kpi.avgField.toFixed(1)} h`} helper="Per officer today" />
      </div>

      {level === 'branch' && (
        <Card title="BO Productivity & Coverage" description="Are visits spread across all DSAs, do they bring files, is collection recovered, are customers treated equally?">
          <OfficerProductivityTable officers={officers} compact />
        </Card>
      )}

      <Card animate={false} title="Officer Activity" description={`${rows.length} officers · click a row for details`} actions={<Button variant="ghost" size="sm" icon={<FiDownload />} onClick={() => toast('Activity table exported (prototype)')}>Export</Button>}>
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <FilterChips options={['All', 'Active', 'Idle', 'Inactive'].map((s) => ({ id: s, label: s, count: s === 'All' ? officers.length : officers.filter((o) => o.status === s).length }))} value={status} onChange={(v) => { setStatus(v); table.setPage(1); }} />
          <span className="spacer" />
          <SearchBar value={query} onChange={setQuery} placeholder="Search officer, branch..." style={{ width: 260 }} />
        </div>
        <DataTable columns={columns} rows={table.paged} sort={table} compact onRowClick={(o) => setSelected(o)} />
        <Pagination table={table} />
      </Card>

      <div className="grid grid-2">
        <Card title="Visit Compliance" description="% of officers meeting daily visit target, last 30 days">
          <BarChart data={compliance} series={[{ key: 'pct', label: 'Compliance' }]} colorBy={(d) => (d.pct >= 70 ? COLORS.success : d.pct >= 50 ? COLORS.warning : COLORS.danger)} formatter={(v) => `${v}%`} yFormatter={(v) => `${v}%`} height={240} />
          <ChartLegend items={[{ label: '≥ 70%', color: COLORS.success }, { label: '50 – 70%', color: COLORS.warning }, { label: '< 50%', color: COLORS.danger }]} />
        </Card>
        <Card title="Activity Heat Map" description="Visit density by day of week and hour">
          <HeatMap rows={DAYS} cols={HOURS.map((h) => (h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`))} values={heat} cellSize={34} />
          <p className="muted mt-4" style={{ fontSize: 12 }}>Peak field activity is 11 AM – 1 PM and 3 – 5 PM. Saturday volume is ~45% of weekdays.</p>
        </Card>
      </div>

      <OfficerDetailPanel officer={selected} onClose={() => setSelected(null)} />
    </>
  );
}

