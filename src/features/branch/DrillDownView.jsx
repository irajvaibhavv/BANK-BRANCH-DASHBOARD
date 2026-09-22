import { useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import Breadcrumb from '@/scope/Breadcrumb';
import { Card, KPICard, PillToggle, SearchBar, Button, Badge } from '@/shared/ui';
import { DataTable, Pagination } from '@/shared/ui/DataTable';
import OfficerDetailPanel from '@/features/officers/OfficerDetailPanel';
import { Sparkline } from '@/shared/charts';
import { useScope } from '@/scope/useScope';
import { useDateRange, DATE_RANGES } from '@/shared/context/DateRangeContext';
import { useToast } from '@/shared/context/ToastContext';
import { useSortableTable } from '@/shared/hooks/useSortableTable';
import { formatCurrency, formatIndian } from '@/shared/utils/formatCurrency';
import { perfClass } from '@/shared/utils/performanceColor';
import { ranked, CHILD_LABEL, LEVEL_LABEL } from '@/scope/scopeHelpers';
import { officerProductivity, TIER_VARIANT } from '@/features/officers/officerProductivity';
import BranchOfficerOverview from '@/features/branch/BranchOfficerOverview';

const QUICK_RANGES = DATE_RANGES.filter((r) => ['month', 'lastMonth', 'quarter', 'custom'].includes(r.id));
const STATUS_VARIANT = { Active: 'success', Idle: 'warning', Inactive: 'danger' };

export default function DrillDownView() {
  const { children, level, agg, drillDown, scopeLabel, officers } = useScope();
  const { rangeId, setRangeId, scale, periodLabel } = useDateRange();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [sortPreset, setSortPreset] = useState('monthlyDisbursement');
  const [officer, setOfficer] = useState(null);

  const rows = useMemo(() => {
    const r = ranked(children, sortPreset === 'targetPct' ? 'targetPct' : 'monthlyDisbursement')
      .map((x) => (x.level === 'officer' ? { ...x, tier: officerProductivity(x.raw).tier } : x));
    const q = query.toLowerCase();
    return q ? r.filter((x) => x.name.toLowerCase().includes(q) || x.location.toLowerCase().includes(q)) : r;
  }, [children, query, sortPreset]);

  const table = useSortableTable(rows, 'rank', 'asc', 20);
  const isOfficerLevel = level === 'branch';
  const atOfficer = level === 'officer';
  const officerRec = atOfficer ? officers[0] : null;

  const columns = [
    { key: 'rank', label: 'Rank', width: 60, num: true, render: (r) => <span className={`rank ${r.rank <= 3 ? `r${r.rank}` : ''}`}>{r.rank}</span> },
    { key: 'name', label: isOfficerLevel ? 'Officer' : `${LEVEL_LABEL[children[0]?.level] || 'Unit'} Name`, strong: true, render: (r) => (
      <div><div>{r.name}</div>{r.head && !isOfficerLevel && <div className="muted" style={{ fontSize: 12 }}>Head: {r.head}</div>}</div>
    ) },
    ...(isOfficerLevel ? [] : [{ key: 'location', label: 'Location' }]),
    ...(isOfficerLevel
      ? [{ key: 'status', label: 'Status', render: (r) => <Badge variant={STATUS_VARIANT[r.status]} dot>{r.status}</Badge> },
         { key: 'tier', label: 'Tier', render: (r) => <Badge variant={TIER_VARIANT[r.tier]}>{r.tier}</Badge> },
         { key: 'visitsToday', label: 'Visits Today', align: 'right', num: true }]
      : [{ key: 'officerCount', label: 'Officers', align: 'right', num: true }]),
    { key: 'activeDsas', label: 'Active DSAs', align: 'right', num: true },
    { key: 'filesSubmitted', label: 'Files', align: 'right', num: true },
    { key: 'filesApproved', label: 'Approved', align: 'right', num: true },
    { key: 'monthlyDisbursement', label: 'Disbursement', align: 'right', num: true, strong: true, render: (r) => formatCurrency(scale(r.monthlyDisbursement)) },
    { key: 'targetPct', label: 'Target %', align: 'right', num: true, render: (r) => <span className={perfClass(r.targetPct)} style={{ fontWeight: 700 }}>{r.targetPct.toFixed(1)}%</span> },
    { key: 'trend', label: 'Trend', sortable: false, render: (r) => <Sparkline data={r.trend} /> },
  ];

  const onRow = (r) => {
    if (r.level === 'officer') setOfficer(r.raw);
    else drillDown(r.level, r.id);
  };

  return (
    <>
      <Breadcrumb />

      {isOfficerLevel ? <BranchOfficerOverview /> : (
      <div className="grid grid-4">
        <KPICard index={0} accent="purple" label="Disbursement" value={formatCurrency(scale(agg.monthlyDisbursement))} helper={`${scopeLabel} · ${periodLabel}`} />
        <KPICard index={1} accent="amber" label="Target Achievement" value={`${agg.targetPct}%`} helper={`Target ${formatCurrency(scale(agg.monthlyTarget))}`} />
        <KPICard index={2} accent="blue" label={atOfficer ? 'Files Submitted' : `${CHILD_LABEL[level]} in scope`} value={atOfficer ? formatIndian(officerRec?.filesSubmitted) : formatIndian(children.length)} helper={`${agg.officerCount} officers · ${agg.branchCount} branches`} />
        <KPICard index={3} accent="green" label="Active DSAs" value={formatIndian(agg.activeDsas)} helper={`${agg.filesApproved} files approved this month`} />
      </div>
      )}

      {atOfficer && officerRec ? (
        <Card title={officerRec.name} description={`Branch Officer · ${officerRec.branchName}`} actions={<Button size="sm" onClick={() => setOfficer(officerRec)}>Open profile panel</Button>}>
          <p className="muted">You are at the lowest drill level. Use the breadcrumb to go back up, or open the officer panel for visits, DSAs and incentive progress.</p>
        </Card>
      ) : (
        <Card animate={false} title={isOfficerLevel ? `Officers · sales & incentive view` : `${CHILD_LABEL[level]} under ${scopeLabel}`} description={isOfficerLevel ? 'Disbursement, files and target achievement per officer · click a row to open the profile' : 'Click any row to open the next level'}>
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <PillToggle options={QUICK_RANGES} value={rangeId} onChange={setRangeId} />
            <SearchBar value={query} onChange={setQuery} placeholder="Search..." style={{ width: 240 }} />
            <select className="input select" value={sortPreset} onChange={(e) => setSortPreset(e.target.value)}>
              <option value="monthlyDisbursement">Rank by disbursement</option>
              <option value="targetPct">Rank by target %</option>
            </select>
            <span className="spacer" />
            <Button variant="ghost" size="sm" icon={<FiDownload />} onClick={() => toast('Table exported to Excel (prototype)')}>Export to Excel</Button>
          </div>
          <DataTable columns={columns} rows={table.paged} sort={table} onRowClick={onRow} emptyText="No units match your search" />
          <Pagination table={table} />
        </Card>
      )}

      <OfficerDetailPanel officer={officer} onClose={() => setOfficer(null)} />
    </>
  );
}
