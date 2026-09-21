import { useMemo } from 'react';
import { FiDownload } from 'react-icons/fi';
import Breadcrumb from '@/scope/Breadcrumb';
import { Card, KPICard, Badge, Button, Avatar } from '@/shared/ui';
import { DataTable } from '@/shared/ui/DataTable';
import { DualAxisChart, BarChart } from '@/shared/charts';
import { useScope } from '@/scope/useScope';
import { useToast } from '@/shared/context/ToastContext';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { SLAB_COLORS, COLORS } from '@/shared/utils/colors';
import slabs from '@/data/incentiveSlabs.json';

export default function IncentiveDashboard() {
  const { officers, monthly, branches, level } = useScope();
  const toast = useToast();

  const totals = useMemo(() => {
    const incentives = officers.reduce((a, o) => a + o.incentiveMTD, 0);
    const commission = monthly[11].commission;
    const disb = monthly[11].disbursement;
    return { incentives, avg: officers.length ? incentives / officers.length : 0, commission, roi: disb ? disb / (incentives + commission) : 0 };
  }, [officers, monthly]);

  const slabCounts = slabs.map((s) => ({ ...s, count: officers.filter((o) => o.slab === s.slab).length }));
  const totalOfficers = officers.length || 1;

  const closeToNext = useMemo(() => officers.map((o) => {
    const next = slabs.slice().reverse().find((s) => s.minPct > o.targetPct);
    if (!next) return null;
    const gapPct = next.minPct - o.targetPct;
    if (gapPct > 20) return null;
    const gapAmt = (o.monthlyTarget * gapPct) / 100;
    return { ...o, nextSlab: next.slab, gapPct, gapAmt, filesNeeded: Math.max(1, Math.ceil(gapAmt / 2200000)) };
  }).filter(Boolean).sort((a, b) => a.gapPct - b.gapPct).slice(0, 10), [officers]);

  const branchComparison = useMemo(() => branches.map((b) => {
    const os = officers.filter((o) => o.branchId === b.id);
    return { label: b.name, avg: os.length ? os.reduce((a, o) => a + o.incentiveMTD, 0) / os.length : 0 };
  }).sort((a, b) => b.avg - a.avg).slice(0, 12), [branches, officers]);

  const columns = [
    { key: 'name', label: 'Officer', strong: true, render: (o) => <div className="flex items-center gap-2"><Avatar name={o.name} size={28} />{o.name}</div> },
    { key: 'branchName', label: 'Branch' },
    { key: 'slab', label: 'Current Slab', render: (o) => <Badge style={{ background: `${SLAB_COLORS[o.slab]}22`, color: SLAB_COLORS[o.slab] }}>{o.slab}</Badge> },
    { key: 'nextSlab', label: 'Next Slab', render: (o) => <Badge style={{ background: `${SLAB_COLORS[o.nextSlab]}22`, color: SLAB_COLORS[o.nextSlab] }}>{o.nextSlab}</Badge> },
    { key: 'targetPct', label: 'Target %', align: 'right', num: true, render: (o) => `${o.targetPct}%` },
    { key: 'gapAmt', label: 'Gap Amount', align: 'right', num: true, strong: true, render: (o) => formatCurrency(o.gapAmt) },
    { key: 'filesNeeded', label: 'Files Needed', align: 'right', num: true, render: (o) => `~${o.filesNeeded}` },
  ];

  return (
    <>
      <Breadcrumb />
      <div className="grid grid-4">
        <KPICard index={0} accent="green" label="Total Incentives Paid" value={formatCurrency(totals.incentives)} helper="Officer incentives this month" delta={6.4} />
        <KPICard index={1} accent="purple" label="Avg Per Officer" value={formatCurrency(totals.avg)} helper={`${officers.length} officers`} delta={2.1} />
        <KPICard index={2} accent="blue" label="Total DSA Commission" value={formatCurrency(totals.commission)} helper="Paid to DSA network" delta={-1.8} />
        <KPICard index={3} accent="amber" label="ROI" value={`${totals.roi.toFixed(1)}x`} helper="Disbursement per ₹ of payout" delta={0.9} />
      </div>

      <Card title="Slab Distribution" description="Officers by incentive slab this month">
        <div style={{ display: 'flex', height: 36, borderRadius: 8, overflow: 'hidden' }}>
          {slabCounts.map((s) => s.count > 0 && (
            <div key={s.slab} title={`${s.slab}: ${s.count}`} style={{ width: `${(s.count / totalOfficers) * 100}%`, background: SLAB_COLORS[s.slab], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, transition: 'width 500ms' }}>
              {(s.count / totalOfficers) > 0.08 && `${s.slab} · ${s.count}`}
            </div>
          ))}
        </div>
        <div className="grid grid-4 mt-4">
          {slabCounts.map((s) => (
            <div key={s.slab} style={{ borderLeft: `3px solid ${SLAB_COLORS[s.slab]}`, paddingLeft: 12 }}>
              <div className="label" style={{ color: SLAB_COLORS[s.slab] }}>{s.slab}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{s.count} <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>({Math.round((s.count / totalOfficers) * 100)}%)</span></div>
              <div className="muted" style={{ fontSize: 12 }}>{s.description} · {s.rate}% payout · bonus {formatCurrency(s.bonus)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card animate={false} title="Close to Next Slab" description="Officers within 20% of the next incentive slab — a nudge here has the highest ROI" actions={<Button variant="ghost" size="sm" icon={<FiDownload />} onClick={() => toast('Exported (prototype)')}>Export</Button>}>
        <DataTable columns={columns} rows={closeToNext} compact emptyText="No officers within 20% of a higher slab" />
      </Card>

      <div className="grid grid-2">
        <Card title="Commission vs Disbursement" description="Monthly DSA commission (bars) against disbursement (line)">
          <DualAxisChart data={monthly} bar={{ key: 'commission', label: 'Commission', color: COLORS.info }} line={{ key: 'disbursement', label: 'Disbursement', color: COLORS.teal }} />
        </Card>
        <Card title="Branch Comparison" description={`Average officer incentive by branch${level === 'branch' ? '' : ' (top 12)'}`}>
          <BarChart data={branchComparison} series={[{ key: 'avg', label: 'Avg incentive', color: COLORS.success }]} layout="horizontal" height={Math.max(200, branchComparison.length * 30)} />
        </Card>
      </div>
    </>
  );
}
