import { useMemo, useState } from 'react';
import { Badge, Avatar, Tooltip, PillToggle } from '../common';
import { DataTable } from './DataTable';
import { useSortableTable } from '../../hooks/useSortableTable';
import { officerProductivity, officerForPeriod, PERIODS, TIER_VARIANT, TIER_COLOR } from '../../utils/officerProductivity';
import { perfClass } from '../../utils/performanceColor';

/** Red-flag badges for one officer (favouring DSAs, low coverage, repeat customers…) */
export function FlagBadges({ flags, max = 2 }) {
  if (!flags?.length) return <Badge variant="success">Healthy</Badge>;
  const shown = flags.slice(0, max);
  return (
    <div className="flex" style={{ gap: 4, flexWrap: "wrap" }}>
      {shown.map((f) => (
        <Tooltip key={f.id} text={f.detail}><Badge variant={f.severity}>{f.label}</Badge></Tooltip>
      ))}
      {flags.length > max && <Badge variant="neutral">+{flags.length - max}</Badge>}
    </div>
  );
}

/** Stacked High / Medium / Low bar with counts, for BOs or DSAs */
export function TierBar({ label, counts, total }) {
  const n = total || counts.High + counts.Medium + counts.Low || 1;
  return (
    <div>
      <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="muted">{n} total</span>
      </div>
      <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: 'var(--input-bg)' }}>
        {['High', 'Medium', 'Low'].map((t) => counts[t] > 0 && (
          <div key={t} title={`${t}: ${counts[t]}`} style={{ width: `${(counts[t] / n) * 100}%`, background: TIER_COLOR[t] }} />
        ))}
      </div>
      <div className="flex" style={{ gap: 14, marginTop: 8, fontSize: 12 }}>
        {['High', 'Medium', 'Low'].map((t) => (
          <span key={t} className="flex items-center" style={{ gap: 4 }}>
            <span className="dot" style={{ background: TIER_COLOR[t] }} />
            {t} <b className="num">{counts[t]}</b>
            <span className="muted">({Math.round((counts[t] / n) * 100)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Small "n / target" bar used for per-DSA visit distribution */
export function VisitBar({ value, target, color }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div className="flex items-center gap-2" style={{ minWidth: 120 }}>
      <div className="progress" style={{ flex: 1, height: 6 }}><span style={{ width: `${pct}%`, background: color || (value >= target ? 'var(--success)' : value > 0 ? 'var(--warning)' : 'var(--danger)') }} /></div>
      <span className="num" style={{ fontSize: 11, width: 36, textAlign: 'right' }}>{value}/{target}</span>
    </div>
  );
}

const Pct = ({ v }) => <span className={perfClass(v)} style={{ fontWeight: 700 }}>{v}%</span>;

/**
 * Productivity & coverage table — one row per officer.
 * Judges the BO on coverage, conversion, collection and fairness rather than incentive alone.
 */
export function OfficerProductivityTable({ officers, onRowClick, pageSize = 15, compact }) {
  const [period, setPeriod] = useState('month'); // week / month filter lives with the table
  const rows = useMemo(() => officers.map((o) => ({ ...officerForPeriod(o, period), p: officerProductivity(o, period) }))
    .map((r) => ({ ...r, score: r.p.score, coveragePct: r.p.coveragePct, conversionPct: r.p.conversionPct, collectionPct: r.p.collectionPct, fairnessPct: r.p.fairnessPct, topSharePct: r.p.topSharePct, dsaVisits: r.p.dsaVisits, flagCount: r.p.flags.length })), [officers, period]);
  const table = useSortableTable(rows, 'score', 'desc', pageSize);

  const columns = [
    { key: 'name', label: 'Officer', strong: true, render: (r) => (
      <div className="flex items-center gap-2"><Avatar name={r.name} size={26} /><div><div>{r.name}</div><div className="muted" style={{ fontSize: 11 }}>{r.p.totalDsas} DSAs · {r.avgWeeklyMeetings} meetings/wk</div></div></div>
    ) },
    { key: 'dsaVisits', label: 'DSA Visits', align: 'right', num: true, render: (r) => <span><b>{r.p.dsaVisits}</b><span className="muted">/{r.dsaVisitTarget}</span></span> },
    { key: 'coveragePct', label: 'Coverage', align: 'right', num: true, render: (r) => <Tooltip text={`${r.p.visited} of ${r.p.totalDsas} DSAs visited · ${r.p.onTarget} at ${period === 'week' ? '1+' : '4+'} visits`}><Pct v={r.coveragePct} /></Tooltip> },
    { key: 'topSharePct', label: 'Top DSA Share', align: 'right', num: true, render: (r) => <Tooltip text={`${r.p.topVisits} visits to ${r.p.topDsa?.firm || '—'}`}><span className={r.topSharePct >= 45 ? 'text-danger' : r.topSharePct >= 35 ? 'text-warning' : ''} style={{ fontWeight: 600 }}>{r.topSharePct}%</span></Tooltip> },
    { key: 'conversionPct', label: 'Visit → File', align: 'right', num: true, render: (r) => <Tooltip text={`${r.productiveVisits} files collected from ${r.p.dsaVisits} visits`}><Pct v={r.conversionPct} /></Tooltip> },
    { key: 'collectionPct', label: 'Collection', align: 'right', num: true, render: (r) => <Tooltip text={`${r.collectionVisits} collection visits`}><Pct v={r.collectionPct} /></Tooltip> },
    { key: 'fairnessPct', label: 'Customer Spread', align: 'right', num: true, render: (r) => <Tooltip text={`${r.uniqueCustomers} unique customers in ${r.customerVisits} visits`}><Pct v={r.fairnessPct} /></Tooltip> },
    { key: 'score', label: 'Score', align: 'right', num: true, render: (r) => (
      <div className="flex items-center gap-2" style={{ justifyContent: "flex-end" }}>
        <span style={{ fontWeight: 700 }}>{r.score}</span>
        <Badge variant={TIER_VARIANT[r.p.tier]}>{r.p.tier}</Badge>
      </div>
    ) },
    { key: 'flagCount', label: 'Flags', render: (r) => <FlagBadges flags={r.p.flags} /> },
  ];

  const week = period === 'week';
  return (
    <>
      <div className="flex items-center gap-3" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <PillToggle size="sm" options={PERIODS} value={period} onChange={setPeriod} />
        <span className="muted" style={{ fontSize: 12 }}>{week ? 'Target: 1 visit per DSA this week' : 'Target: 4 visits per DSA this month'} · {rows.filter((r) => r.p.flags.length).length} flagged</span>
      </div>
      <DataTable columns={columns} rows={table.paged} sort={table} compact={compact} onRowClick={onRowClick} emptyText="No officers in scope" />
    </>
  );
}
