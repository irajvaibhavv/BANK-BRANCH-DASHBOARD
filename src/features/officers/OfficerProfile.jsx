import { useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { FiArrowLeft, FiPhone, FiMail, FiMapPin, FiCalendar, FiAlertTriangle } from 'react-icons/fi';
import { Card, KPICard, Badge, Avatar, Button, Tooltip } from '@/shared/ui';
import { DataTable } from '@/shared/ui/DataTable';
import { AreaChart, ProgressBar, DonutChart, ChartLegend } from '@/shared/charts';
import { formatCurrency, formatIndian } from '@/shared/utils/formatCurrency';
import { relativeTime, daysAgo } from '@/shared/utils/formatNumber';
import { qualityVariant, perfClass } from '@/shared/utils/performanceColor';
import { SLAB_COLORS, CHART_COLORS } from '@/shared/utils/colors';
import { DATA } from '@/scope/scopeHelpers';
import { dsaAreaName } from '@/scope/areas';
import slabs from '@/data/incentiveSlabs.json';
import { officerProductivity, TIER_VARIANT, TIER_COLOR } from '@/features/officers/officerProductivity';
import { FlagBadges, VisitBar } from '@/features/officers/OfficerProductivityTable';

const STATUS_VARIANT = { Active: 'success', Idle: 'warning', Inactive: 'danger' };
const STAGE_VARIANT = { Disbursed: 'info', Approved: 'success', Rejected: 'danger', Incomplete: 'warning', Submitted: 'neutral', 'Under Review': 'neutral' };

/** Full-page profile of one branch officer: sales, activity, productivity & coverage, DSAs, files, incentive */
export default function OfficerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const officer = DATA.officers.find((o) => o.id === id);
  if (!officer) return <Navigate to="/activity" replace />;
  return <Profile officer={officer} onBack={() => navigate(-1)} />;
}

function Profile({ officer, onBack }) {
  const prod = useMemo(() => officerProductivity(officer), [officer]);
  const dsas = useMemo(() => DATA.dsas.filter((d) => d.officerId === officer.id), [officer.id]);
  const files = useMemo(() => DATA.loanFiles.filter((f) => f.officerId === officer.id).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)), [officer.id]);
  const nextSlab = slabs.slice().reverse().find((s) => s.minPct > officer.targetPct);
  const trend = DATA.months.slice(-6).map((m, i) => ({ label: m.label, value: officer.trend[i] }));
  const visitMix = [
    { name: 'DSA visits', value: officer.dsaVisitsMonth, color: CHART_COLORS[0] },
    { name: 'Customer visits', value: officer.customerVisits, color: CHART_COLORS[1] },
    { name: 'Collection visits', value: officer.collectionVisits, color: CHART_COLORS[3] },
  ].filter((x) => x.value > 0);
  const byStage = files.reduce((a, f) => ({ ...a, [f.stage]: (a[f.stage] || 0) + 1 }), {});
  const areas = [...new Set(dsas.map(dsaAreaName))];

  const dsaColumns = [
    { key: 'firm', label: 'DSA', strong: true, render: (d) => <div><div>{d.firm}</div><div className="muted" style={{ fontSize: 11 }}>{d.name} · {dsaAreaName(d)}</div></div> },
    { key: 'quality', label: 'Quality', render: (d) => <Badge variant={qualityVariant(d.quality)}>{d.quality}</Badge> },
    { key: 'visits', label: 'Visits (this month)', align: 'right', num: true, render: (d) => { const v = (officer.dsaVisits || []).find((x) => x.dsaId === d.id); return v ? <span style={{ width: 120, display: 'inline-block' }}><VisitBar value={v.visits} target={v.target} /></span> : '—'; } },
    { key: 'files', label: 'Files', align: 'right', num: true },
    { key: 'approvalRate', label: 'Approval %', align: 'right', num: true, render: (d) => <span className={perfClass(d.approvalRate)} style={{ fontWeight: 600 }}>{d.approvalRate}%</span> },
    { key: 'disbursement', label: 'Disbursement', align: 'right', num: true, render: (d) => formatCurrency(d.disbursement) },
    { key: 'commission', label: 'Commission', align: 'right', num: true, render: (d) => formatCurrency(d.commission || 0) },
    { key: 'lastActive', label: 'Last Active', render: (d) => <span className={daysAgo(d.lastActive) > 30 ? 'text-danger' : daysAgo(d.lastActive) > 14 ? 'text-warning' : ''}>{relativeTime(d.lastActive)}</span> },
  ];
  const fileColumns = [
    { key: 'id', label: 'File', strong: true },
    { key: 'borrower', label: 'Borrower' },
    { key: 'loanType', label: 'Product' },
    { key: 'dsaFirm', label: 'DSA' },
    { key: 'amount', label: 'Amount', align: 'right', num: true, render: (f) => formatCurrency(f.amount) },
    { key: 'stage', label: 'Stage', render: (f) => <Badge variant={STAGE_VARIANT[f.stage] || 'neutral'}>{f.stage}</Badge> },
    { key: 'daysAtStage', label: 'Days at stage', align: 'right', num: true, render: (f) => <span className={f.daysAtStage > 15 ? 'text-danger' : f.daysAtStage > 7 ? 'text-warning' : ''}>{f.daysAtStage}d</span> },
  ];

  return (
    <>
      <button className="link" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><FiArrowLeft size={14} /> Back</button>

      {/* ---- header ---- */}
      <Card animate={false}>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <Avatar name={officer.name} size={64} />
          <div className="flex-1" style={{ minWidth: 240 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{officer.name}</div>
            <div className="muted flex items-center gap-2" style={{ fontSize: 13, marginTop: 2 }}><FiMapPin size={13} /> {officer.branchName} Branch · {officer.city} <span>·</span> <FiCalendar size={13} /> joined {new Date(officer.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div>
            <div className="flex gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <Badge variant={STATUS_VARIANT[officer.status]} dot>{officer.status}</Badge>
              <Badge variant="brand">{officer.slab} slab</Badge>
              <Badge variant={TIER_VARIANT[prod.tier]}>Productivity {prod.tier} · {prod.score}</Badge>
              {officer.streakMonths > 1 && <Badge variant="success">🔥 {officer.streakMonths}-month streak</Badge>}
            </div>
          </div>
          <div className="flex-col gap-2" style={{ fontSize: 13 }}>
            <span className="flex items-center gap-2"><FiPhone size={13} style={{ color: 'var(--text-muted)' }} /> +91 {officer.phone}</span>
            <span className="flex items-center gap-2"><FiMail size={13} style={{ color: 'var(--text-muted)' }} /> {officer.email}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.open(`tel:${officer.phone}`)}>Call</Button>
            <Button onClick={() => window.open(`mailto:${officer.email}`)}>Message</Button>
          </div>
        </div>
        {prod.flags.length > 0 && (
          <div style={{ marginTop: 14, background: 'var(--danger-tint)', borderRadius: 8, padding: '10px 12px' }}>
            <div className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}><FiAlertTriangle size={13} style={{ color: 'var(--danger)' }} /> Red flags this month</div>
            <div className="flex-col gap-1" style={{ fontSize: 12 }}>
              {prod.flags.map((f) => <div key={f.id}><b>{f.label}</b> — {f.detail}</div>)}
            </div>
          </div>
        )}
      </Card>

      {/* ---- KPIs ---- */}
      <div className="grid grid-6">
        <KPICard index={0} accent="purple" label="Disbursement MTD" value={formatCurrency(officer.monthlyDisbursement)} helper={`target ${formatCurrency(officer.monthlyTarget)}`} />
        <KPICard index={1} accent={officer.targetPct >= 100 ? 'green' : officer.targetPct >= 80 ? 'amber' : 'pink'} label="Target Achievement" value={`${officer.targetPct}%`} helper={`quarter ${formatCurrency(officer.quarterDisbursement)}`} />
        <KPICard index={2} accent="teal" label="Files" value={`${officer.filesApproved} / ${officer.filesSubmitted}`} helper="approved / submitted" />
        <KPICard index={3} accent="blue" label="Visits" value={`${officer.visitsWeek} / wk`} helper={`${officer.visitsMonth} this month · ${officer.visitsToday} today`} />
        <KPICard index={4} accent="amber" label="DSAs · Customers" value={`${officer.dsaCount} · ${officer.customersCount}`} helper={`${areas.length} areas covered`} />
        <KPICard index={5} accent="green" label="Incentive MTD" value={formatCurrency(officer.incentiveMTD)} helper={`DSA commission ${formatCurrency(officer.commissionMTD || 0)}`} />
      </div>

      {/* ---- trend + visit mix ---- */}
      <div className="grid grid-2-1">
        <Card title="Disbursement trend" description="Last 6 months">
          <AreaChart data={trend} yKey="value" name="Disbursement" height={230} />
        </Card>
        <Card title="How the month was spent" description={`${officer.visitsMonth} visits · ${officer.avgWeeklyMeetings} meetings / week`}>
          <DonutChart data={visitMix} height={190} centerLabel="visits" centerValue={formatIndian(officer.visitsMonth)} formatter={(v) => `${v} visits`} />
          <ChartLegend items={visitMix.map((x) => ({ label: `${x.name} · ${x.value}`, color: x.color }))} />
        </Card>
      </div>

      {/* ---- productivity & coverage ---- */}
      <Card animate={false} title="Productivity & coverage" description="How the officer works — not just what they sold" actions={<FlagBadges flags={prod.flags} max={4} />}>
        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <Metric label="DSA coverage" value={`${prod.coveragePct}%`} tier={prod.coveragePct >= 80 ? 'High' : prod.coveragePct >= 65 ? 'Medium' : 'Low'} sub={`${prod.visited} of ${prod.totalDsas} DSAs visited · ${prod.onTarget} at 4+ visits`} />
          <Metric label="Visit → file" value={`${prod.conversionPct}%`} tier={prod.conversionPct >= 45 ? 'High' : prod.conversionPct >= 30 ? 'Medium' : 'Low'} sub={`${officer.productiveVisits} files from ${prod.dsaVisits} DSA visits`} />
          <Metric label="Collection" value={`${prod.collectionPct}%`} tier={prod.collectionPct >= 80 ? 'High' : prod.collectionPct >= 60 ? 'Medium' : 'Low'} sub={`${formatCurrency(officer.collectionAmount)} of ${formatCurrency(officer.collectionDue)} due`} />
          <Metric label="Customer spread" value={`${prod.fairnessPct}%`} tier={prod.fairnessPct >= 75 ? 'High' : prod.fairnessPct >= 55 ? 'Medium' : 'Low'} sub={`${officer.uniqueCustomers} unique customers in ${officer.customerVisits} visits`} />
        </div>
        <div className="flex justify-between" style={{ fontSize: 12.5, marginBottom: 8 }}>
          <b>DSA visits this month — who got how many</b>
          <span className="num"><b>{prod.dsaVisits}</b> / {officer.dsaVisitTarget} <span className="muted">(target 4 per DSA)</span> · top DSA share <b className={prod.topSharePct >= 45 ? 'text-danger' : ''}>{prod.topSharePct}%</b></span>
        </div>
        <div className="grid grid-2" style={{ gap: '4px 28px' }}>
          {[...(officer.dsaVisits || [])].sort((a, b) => b.visits - a.visits).map((d) => (
            <div className="flex items-center gap-2" key={d.dsaId} style={{ padding: '4px 0', fontSize: 12 }}>
              <span style={{ width: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.firm}>{d.firm} <span className="muted">· {d.quality}</span></span>
              <div className="flex-1"><VisitBar value={d.visits} target={d.target} /></div>
              <span className="muted num" style={{ width: 90, textAlign: 'right' }}>{d.visits}/{d.target} · {d.filesCollected} files</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ---- DSAs ---- */}
      <Card animate={false} title={`DSAs managed (${dsas.length})`} description={`Across ${areas.join(', ')}`}>
        <DataTable columns={dsaColumns} rows={[...dsas].sort((a, b) => b.disbursement - a.disbursement)} compact emptyText="No DSAs assigned" />
      </Card>

      {/* ---- files + incentive ---- */}
      <div className="grid grid-2-1">
        <Card animate={false} title={`Loan files (${files.length})`} description={Object.entries(byStage).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(' · ') || 'No files this month'}>
          <DataTable columns={fileColumns} rows={files.slice(0, 12)} compact emptyText="No loan files" />
        </Card>
        <Card title="Incentive progress" description="Current slab and distance to the next">
          <div className="flex justify-between" style={{ fontSize: 13, marginBottom: 8 }}>
            <span>Earned MTD <b className="num">{formatCurrency(officer.incentiveMTD)}</b></span>
            <span style={{ color: SLAB_COLORS[officer.slab], fontWeight: 700 }}>{officer.slab}</span>
          </div>
          <ProgressBar value={officer.targetPct} max={nextSlab ? nextSlab.minPct : 120} color={SLAB_COLORS[officer.slab]} height={10} />
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            {nextSlab ? `${(nextSlab.minPct - officer.targetPct).toFixed(1)} pts to ${nextSlab.slab} · ≈ ${formatCurrency(officer.monthlyTarget * (nextSlab.minPct - officer.targetPct) / 100)} more disbursement` : 'Top slab reached 🎉'}
          </p>
          <div className="divider" />
          <div className="label" style={{ marginBottom: 8 }}>Slabs</div>
          {slabs.map((s) => (
            <div key={s.slab} className="flex justify-between" style={{ fontSize: 12, padding: '5px 0', fontWeight: s.slab === officer.slab ? 700 : 400, color: s.slab === officer.slab ? SLAB_COLORS[s.slab] : undefined }}>
              <span>{s.slab}</span><span className="num">≥ {s.minPct}% of target</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

function Metric({ label, value, tier, sub }) {
  return (
    <div style={{ background: 'var(--input-bg)', borderRadius: 10, padding: '12px 14px', borderTop: `3px solid ${TIER_COLOR[tier]}` }}>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: 24, fontWeight: 700, color: TIER_COLOR[tier] }}>{value}</div>
      <Tooltip text={sub}><div className="muted" style={{ fontSize: 11.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div></Tooltip>
    </div>
  );
}
