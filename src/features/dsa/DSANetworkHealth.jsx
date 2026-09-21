import { useMemo, useState } from 'react';
import { FiDownload, FiAlertTriangle, FiUserX } from 'react-icons/fi';
import Breadcrumb from '@/scope/Breadcrumb';
import { Card, KPICard, Badge, SearchBar, Button, Avatar } from '@/shared/ui';
import { DataTable, Pagination, FilterChips } from '@/shared/ui/DataTable';
import { DonutChart, LineChart, ChartLegend } from '@/shared/charts';
import { useScope } from '@/scope/useScope';
import { useSortableTable } from '@/shared/hooks/useSortableTable';
import { useToast } from '@/shared/context/ToastContext';
import { formatCurrency, formatIndian } from '@/shared/utils/formatCurrency';
import { relativeTime, daysAgo } from '@/shared/utils/formatNumber';
import { qualityVariant } from '@/shared/utils/performanceColor';
import { COLORS } from '@/shared/utils/colors';

const FILTERS = ['All', 'High Quality', 'Average', 'Low Quality', 'Inactive'];
const MAP = { 'High Quality': 'High', Average: 'Average', 'Low Quality': 'Low', Inactive: 'Inactive' };

export default function DSANetworkHealth() {
  const { dsas, officers, monthly, agg, drillDown, level } = useScope();
  const toast = useToast();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [officerId, setOfficerId] = useState('all'); // which BO's DSAs to show (branch level)
  const showOfficer = level === 'branch' || level === 'officer';

  const counts = useMemo(() => ({
    total: dsas.length,
    active: dsas.filter((d) => d.quality !== 'Inactive').length,
    inactive: dsas.filter((d) => d.quality === 'Inactive').length,
    high: dsas.filter((d) => d.quality === 'High').length,
    avg: dsas.filter((d) => d.quality === 'Average').length,
    low: dsas.filter((d) => d.quality === 'Low').length,
    newMonth: dsas.filter((d) => daysAgo(d.onboardedAt) <= 30).length,
    score: dsas.length ? Math.round(dsas.reduce((a, d) => a + d.qualityScore, 0) / dsas.length) : 0,
  }), [dsas]);

  const rows = useMemo(() => {
    let r = dsas;
    if (filter !== 'All') r = r.filter((d) => d.quality === MAP[filter]);
    if (officerId !== 'all') r = r.filter((d) => d.officerId === officerId);
    const q = query.toLowerCase();
    if (q) r = r.filter((d) => d.firm.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q) || d.branchName.toLowerCase().includes(q));
    return r;
  }, [dsas, filter, query, officerId]);
  const table = useSortableTable(rows, 'disbursement', 'desc', 15);

  const atRisk = dsas.filter((d) => d.declining && d.quality !== 'Inactive').sort((a, b) => daysAgo(b.lastActive) - daysAgo(a.lastActive)).slice(0, 6);
  const lost = dsas.filter((d) => d.quality === 'Inactive').sort((a, b) => daysAgo(b.lastActive) - daysAgo(a.lastActive)).slice(0, 6);
  // per-BO roll-up shown above the table when one officer is picked
  const boSummary = useMemo(() => {
    if (officerId === 'all') return null;
    const o = officers.find((x) => x.id === officerId); const mine = dsas.filter((d) => d.officerId === officerId);
    if (!o) return null;
    const files = mine.reduce((a, d) => a + d.files, 0), approved = mine.reduce((a, d) => a + d.approved, 0);
    return { o, n: mine.length, high: mine.filter((d) => d.quality === 'High').length, low: mine.filter((d) => d.quality === 'Low').length, inactive: mine.filter((d) => d.quality === 'Inactive').length,
      files, approval: files ? Math.round((approved / files) * 100) : 0, disbursement: mine.reduce((a, d) => a + d.disbursement, 0), commission: mine.reduce((a, d) => a + (d.commission || 0), 0) };
  }, [officerId, officers, dsas]);
  const top10 = [...dsas].sort((a, b) => b.disbursement - a.disbursement).slice(0, 10);

  const columns = [
    { key: 'name', label: 'DSA Name', strong: true, render: (d) => <div className="flex items-center gap-2"><Avatar name={d.name} size={26} color="var(--teal)" />{d.name}</div> },
    { key: 'firm', label: 'Firm' },
    { key: 'city', label: 'Location' },
    ...(showOfficer ? [{ key: 'officerName', label: 'Branch Officer', render: (d) => <button className="link" style={{ fontWeight: 500 }} onClick={(e) => { e.stopPropagation(); setOfficerId(officerId === d.officerId ? 'all' : d.officerId); table.setPage(1); }}>{d.officerName}</button> }] : []),
    ...(showOfficer ? [] : [{ key: 'branchName', label: 'Branch', render: (d) => <button className="link" style={{ fontWeight: 500 }} onClick={(e) => { e.stopPropagation(); if (level !== 'branch' && level !== 'officer') drillDown('branch', d.branchId); }}>{d.branchName}</button> }]),
    { key: 'files', label: 'Files', align: 'right', num: true },
    { key: 'approvalRate', label: 'Approval %', align: 'right', num: true, render: (d) => <span className={d.approvalRate >= 65 ? 'text-success' : d.approvalRate >= 50 ? 'text-warning' : 'text-danger'} style={{ fontWeight: 600 }}>{d.approvalRate}%</span> },
    { key: 'disbursement', label: 'Disbursement', align: 'right', num: true, strong: true, render: (d) => formatCurrency(d.disbursement) },
    { key: 'quality', label: 'Quality', render: (d) => <Badge variant={qualityVariant(d.quality)}>{d.quality}</Badge> },
    { key: 'lastActive', label: 'Last Active', render: (d) => <span className={daysAgo(d.lastActive) > 30 ? 'text-danger' : daysAgo(d.lastActive) > 14 ? 'text-warning' : ''}>{relativeTime(d.lastActive)}</span> },
  ];

  return (
    <>
      <Breadcrumb />
      <div className="grid grid-5">
        <KPICard index={0} accent="purple" label="Total DSAs" value={formatIndian(counts.total)} helper={`${agg.branchCount} branches`} />
        <KPICard index={1} accent="green" label="Active DSAs" value={formatIndian(counts.active)} helper={`${counts.total ? Math.round((counts.active / counts.total) * 100) : 0}% of network`} />
        <KPICard index={2} accent="red" label="Inactive DSAs" value={formatIndian(counts.inactive)} helper="No files in 60+ days" />
        <KPICard index={3} accent="blue" label="New This Month" value={formatIndian(counts.newMonth)} helper="Onboarded in last 30 days" />
        <KPICard index={4} accent="amber" label="Avg Quality Score" value={`${counts.score}`} helper="Out of 100" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <Card title="DSA Quality Distribution" description="Based on approval rate and file volume">
          <DonutChart data={[{ name: 'High Quality', value: counts.high, color: COLORS.success }, { name: 'Average', value: counts.avg, color: COLORS.warning }, { name: 'Low Quality', value: counts.low, color: COLORS.danger }, { name: 'Inactive', value: counts.inactive, color: COLORS.grey }]} centerLabel="DSAs" height={220} />
          <div className="flex-col gap-2 mt-2">
            {[['High Quality', counts.high, COLORS.success], ['Average', counts.avg, COLORS.warning], ['Low Quality', counts.low, COLORS.danger], ['Inactive', counts.inactive, COLORS.grey]].map(([l, v, c]) => (
              <div key={l} className="flex justify-between items-center" style={{ fontSize: 12 }}>
                <span className="flex items-center gap-2"><span className="dot" style={{ background: c, width: 10, height: 10 }} />{l}</span>
                <span className="num"><b>{v}</b> <span className="muted">({counts.total ? Math.round((v / counts.total) * 100) : 0}%)</span></span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="DSA Churn" description="Active DSAs over the last 12 months">
          <LineChart data={monthly} series={[{ key: 'activeDsas', label: 'Active DSAs', color: COLORS.teal }]} height={220} />
          <ChartLegend items={[{ label: 'Active DSAs', color: COLORS.teal }]} />
          <div className="grid grid-2 mt-4">
            <div>
              <div className="label" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><FiAlertTriangle /> At Risk ({dsas.filter((d) => d.declining && d.quality !== 'Inactive').length})</div>
              {atRisk.length ? atRisk.map((d) => <div key={d.id} className="flex justify-between" style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--border)' }}><span>{d.firm}</span><span className="muted">{daysAgo(d.lastActive)}d idle</span></div>) : <p className="muted">None</p>}
            </div>
            <div>
              <div className="label" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><FiUserX /> Lost DSAs ({counts.inactive})</div>
              {lost.length ? lost.map((d) => <div key={d.id} className="flex justify-between" style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--border)' }}><span>{d.firm}</span><span className="muted">{daysAgo(d.lastActive)}d</span></div>) : <p className="muted">None</p>}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <Card animate={false} title="DSA Performance" description={`${rows.length} DSAs`} actions={<Button variant="ghost" size="sm" icon={<FiDownload />} onClick={() => toast('DSA table exported (prototype)')}>Export</Button>}>
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <FilterChips options={FILTERS.map((f) => ({ id: f, label: f, count: f === 'All' ? counts.total : dsas.filter((d) => d.quality === MAP[f]).length }))} value={filter} onChange={(v) => { setFilter(v); table.setPage(1); }} />
            <span className="spacer" />
            {showOfficer && (
              <select className="input select" value={officerId} onChange={(e) => { setOfficerId(e.target.value); table.setPage(1); }} style={{ width: 200 }}>
                <option value="all">All branch officers</option>
                {officers.map((o) => <option key={o.id} value={o.id}>{o.name} ({dsas.filter((d) => d.officerId === o.id).length})</option>)}
              </select>
            )}
            <SearchBar value={query} onChange={setQuery} placeholder="Search DSA, firm, branch..." style={{ width: 240 }} />
          </div>
          {boSummary && (
            <div className="flex items-center gap-3" style={{ background: 'var(--brand-tint-2)', border: '1px solid var(--brand-tint)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, flexWrap: 'wrap' }}>
              <Avatar name={boSummary.o.name} size={30} />
              <div style={{ minWidth: 150 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{boSummary.o.name}</div><div className="muted" style={{ fontSize: 11 }}>{boSummary.n} DSAs · {boSummary.high} high · {boSummary.low} low · {boSummary.inactive} inactive</div></div>
              {[['Files', formatIndian(boSummary.files)], ['Approval', `${boSummary.approval}%`], ['Disbursement', formatCurrency(boSummary.disbursement)], ['DSA commission', formatCurrency(boSummary.commission)]].map(([l, v]) => (
                <div key={l} style={{ marginLeft: 'auto' }}><div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div><div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{v}</div></div>
              ))}
              <button className="link" style={{ fontSize: 12 }} onClick={() => setOfficerId('all')}>Clear</button>
            </div>
          )}
          <DataTable columns={columns} rows={table.paged} sort={table} compact />
          <Pagination table={table} />
        </Card>

        <Card title="Top 10 DSAs" description="By disbursement this month">
          {top10.map((d, i) => (
            <div key={d.id} className="list-row" style={{ padding: '9px 0' }}>
              <span className={`rank ${i < 3 ? `r${i + 1}` : ''}`}>{i + 1}</span>
              <div className="flex-1">
                <div style={{ fontSize: 12, fontWeight: 600 }}>{d.firm}</div>
                <div className="muted" style={{ fontSize: 12 }}>{d.branchName} · {d.files} files · {d.approvalRate}%</div>
              </div>
              <span className="num" style={{ fontWeight: 700, fontSize: 12 }}>{formatCurrency(d.disbursement)}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
