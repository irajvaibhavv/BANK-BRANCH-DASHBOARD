import { useMemo, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Card, KPICard, PillToggle, ChartTableToggle, Badge, Avatar } from '../../components/common';
import { DualAxisChart, LineChart, ChartLegend } from '../../components/charts';
import { DataTable } from '../../components/tables/DataTable';
import { OfficerProductivityTable, TierBar, FlagBadges } from '../../components/tables/OfficerProductivity';
import { useScope } from '../../hooks/useScope';
import { useDateRange } from '../../context/DateRangeContext';
import { formatCurrency, formatIndian } from '../../utils/formatCurrency';
import { officerProductivity, dsaTier, tierCounts } from '../../utils/officerProductivity';
import { COLORS } from '../../utils/colors';

const TREND_VIEWS = [{ id: 'volume', label: 'Disbursement & files' }, { id: 'quality', label: 'Completion rate' }];

/**
 * Branch Head's view of their own branch: what the BOs and DSAs are doing overall,
 * monthly trends, who is high / medium / low, commission, and BO productivity.
 */
export default function BranchOfficerOverview({ onOpenOfficer }) {
  const { officers, dsas, loanFiles, branches, monthly, scopeLabel } = useScope();
  const { scale, periodLabel } = useDateRange();
  const [trendView, setTrendView] = useState('volume');
  const [trendMode, setTrendMode] = useState('chart');
  const branch = branches[0];

  const prod = useMemo(() => officers.map((o) => ({ o, p: officerProductivity(o) })), [officers]);
  const boTiers = useMemo(() => tierCounts(prod, (x) => x.p.tier), [prod]);
  const dsaTiers = useMemo(() => tierCounts(dsas, dsaTier), [dsas]);
  const flagged = useMemo(() => prod.filter((x) => x.p.flags.length).sort((a, b) => b.p.flags.length - a.p.flags.length || a.p.score - b.p.score), [prod]);

  const cur = monthly[11], prev = monthly[10];
  const n = officers.length || 1;
  const customers = officers.reduce((a, o) => a + (o.customersCount || 0), 0);
  const commission = officers.reduce((a, o) => a + (o.commissionMTD || 0), 0);
  const avgWeeklyMeetings = officers.reduce((a, o) => a + (o.avgWeeklyMeetings || 0), 0) / n;
  const activeDsas = dsas.filter((d) => d.quality !== 'Inactive').length;
  const completionPct = cur.submitted ? Math.round((cur.approved / cur.submitted) * 100) : 0;
  const prevCompletionPct = prev.submitted ? Math.round((prev.approved / prev.submitted) * 100) : 0;
  const decided = loanFiles.filter((f) => ['Approved', 'Disbursed', 'Rejected'].includes(f.stage)).length;
  const pctChange = (a, b) => (b ? ((a - b) / b) * 100 : 0);

  const trend = useMemo(() => monthly.map((m) => ({
    label: m.label, disbursement: m.disbursement, submitted: m.submitted, approved: m.approved,
    completion: m.submitted ? Math.round((m.approved / m.submitted) * 100) : 0,
    rejection: m.submitted ? Math.round((m.rejected / m.submitted) * 100) : 0,
  })), [monthly]);

  const trendColumns = [
    { key: 'label', label: 'Month', strong: true },
    { key: 'disbursement', label: 'Disbursement', align: 'right', num: true, render: (r) => formatCurrency(r.disbursement) },
    { key: 'submitted', label: 'Files In', align: 'right', num: true },
    { key: 'approved', label: 'Approved', align: 'right', num: true },
    { key: 'completion', label: 'Completion %', align: 'right', num: true, render: (r) => `${r.completion}%` },
    { key: 'rejection', label: 'Rejection %', align: 'right', num: true, render: (r) => `${r.rejection}%` },
  ];

  return (
    <>
      <div className="grid grid-6">
        <KPICard index={0} accent="purple" label="Branch Officers" value={formatIndian(officers.length)} helper={`${officers.filter((o) => o.status === 'Active').length} active today`} />
        <KPICard index={1} accent="teal" label="DSAs" value={`${formatIndian(activeDsas)} / ${formatIndian(dsas.length)}`} helper={`active / total · ${branch?.newDsasThisMonth || 0} new this month`} />
        <KPICard index={2} accent="blue" label="Customers" value={formatIndian(customers)} helper={`≈ ${Math.round(customers / n)} per officer`} />
        <KPICard index={3} accent="amber" label="Files Received" value={formatIndian(scale(cur.submitted))} helper={`${completionPct}% completed · ${decided} decided in pipeline`} delta={pctChange(completionPct, prevCompletionPct)} deltaLabel="completion rate vs last month" />
        <KPICard index={4} accent="green" label="Commission" value={formatCurrency(scale(commission))} helper={`DSA commission · ${periodLabel}`} />
        <KPICard index={5} accent="pink" label="Meetings / BO / Week" value={avgWeeklyMeetings.toFixed(1)} helper="DSA + customer + collection visits" />
      </div>

      <div className="grid grid-2-1">
        <Card title="Monthly Trends" description={`${scopeLabel} · last 12 months`} actions={
          <div className="flex items-center gap-2">
            <PillToggle options={TREND_VIEWS} value={trendView} onChange={setTrendView} size="sm" />
            <ChartTableToggle value={trendMode} onChange={setTrendMode} />
          </div>
        }>
          {trendMode === 'table' ? (
            <DataTable columns={trendColumns} rows={[...trend].reverse()} rowKey="label" compact />
          ) : trendView === 'volume' ? (
            <DualAxisChart data={trend} bar={{ key: 'disbursement', label: 'Disbursement', color: COLORS.teal }} line={{ key: 'submitted', label: 'Files received', color: COLORS.warning, axisFormatter: formatIndian }} formatter={(v, k) => (k === 'disbursement' ? formatCurrency(v) : formatIndian(v))} height={260} />
          ) : (
            <>
              <LineChart data={trend} series={[{ key: 'completion', label: 'Completion %', color: COLORS.success }, { key: 'rejection', label: 'Rejection %', color: COLORS.danger }]} formatter={(v) => `${v}%`} yFormatter={(v) => `${v}%`} height={260} />
              <ChartLegend items={[{ label: 'Completion % (approved ÷ received)', color: COLORS.success }, { label: 'Rejection %', color: COLORS.danger }]} />
            </>
          )}
        </Card>

        <Card title="Performer Tiers" description="High / Medium / Low across the branch">
          <div className="flex-col" style={{ gap: 22 }}>
            <TierBar label="Branch Officers (productivity score)" counts={boTiers} />
            <TierBar label="DSAs (approval quality)" counts={dsaTiers} />
            <div className="divider" style={{ margin: 0 }} />
            <div>
              <div className="label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><FiAlertTriangle size={12} style={{ color: 'var(--danger)' }} /> Needs attention ({flagged.length})</div>
              {flagged.length === 0 && <p className="muted">No red flags this month.</p>}
              {flagged.slice(0, 4).map(({ o, p }) => (
                <div className="list-row" key={o.id} style={{ padding: '8px 0', cursor: 'pointer' }} onClick={() => onOpenOfficer?.(o)}>
                  <Avatar name={o.name} size={26} />
                  <div className="flex-1">
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{o.name} <Badge variant="neutral" style={{ marginLeft: 4 }}>{p.score}</Badge></div>
                    <div style={{ marginTop: 4 }}><FlagBadges flags={p.flags} max={2} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card animate={false} title="BO Productivity & Coverage" description="Judged on how visits are spread across DSAs, whether they bring files, collection recovered and customer spread — not incentive alone. Click a row for the DSA-wise breakdown.">
        <OfficerProductivityTable officers={officers} onRowClick={(r) => onOpenOfficer?.(r)} compact />
        <p className="muted mt-4" style={{ fontSize: 12 }}>
          <b>Coverage</b> = DSAs visited ÷ DSAs assigned. <b>Top DSA share</b> above 45% with the visit target met is flagged as favouring.
          <b> Visit → File</b> = visits that produced a file. <b>Collection</b> = amount recovered ÷ due. <b>Customer spread</b> = unique customers ÷ customer visits.
        </p>
      </Card>
    </>
  );
}
