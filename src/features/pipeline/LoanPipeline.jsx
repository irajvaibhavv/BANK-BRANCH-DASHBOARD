import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiDownload, FiAlertTriangle, FiArrowRight, FiClock } from 'react-icons/fi';
import Breadcrumb from '@/scope/Breadcrumb';
import { Card, StatusCard, Badge, SearchBar, Button, Trend } from '@/shared/ui';
import { DataTable, Pagination } from '@/shared/ui/DataTable';
import { useScope } from '@/scope/useScope';
import { useSortableTable } from '@/shared/hooks/useSortableTable';
import { useToast } from '@/shared/context/ToastContext';
import { formatCurrency, formatIndian } from '@/shared/utils/formatCurrency';
import { formatDate } from '@/shared/utils/formatNumber';
import { STAGE_COLORS, PRODUCT_COLORS } from '@/shared/utils/colors';

const STAGES = ['Submitted', 'Under Review', 'Approved', 'Disbursed'];
const STAGE_BADGE = { Submitted: 'info', 'Under Review': 'brand', Approved: 'success', Disbursed: 'success', Rejected: 'danger', Incomplete: 'pink' };
const STAGE_CARD = { Submitted: 'blue', 'Under Review': 'purple', Approved: 'green', Disbursed: 'teal' };
/** 'Pending' groups the two waiting stages, matching the Overview tile */
const PENDING = ['Submitted', 'Under Review'];
const SLA = { Submitted: 3, 'Under Review': 7, Approved: 5, Disbursed: 0, Incomplete: 5, Rejected: 0 };

export default function LoanPipeline() {
  const { loanFiles, branches, level } = useScope();
  const toast = useToast();
  const location = useLocation();
  const tableRef = useRef(null);
  // an Overview tile can open this page pre-filtered on its stage
  const [stage, setStage] = useState(location.state?.stage || 'All');
  const [branch, setBranch] = useState('All');
  const [type, setType] = useState('All');
  const [query, setQuery] = useState('');

  // cumulative funnel counts
  const funnel = useMemo(() => {
    const idx = (s) => STAGES.indexOf(s);
    const reached = (i) => loanFiles.filter((f) => idx(f.stage) >= i || (f.stage === 'Rejected' && i <= 1)).length;
    return STAGES.map((s, i) => ({ stage: s, count: reached(i), atStage: loanFiles.filter((f) => f.stage === s), color: STAGE_COLORS[s] }));
  }, [loanFiles]);

  const rows = useMemo(() => {
    let r = loanFiles;
    if (stage === 'Pending') r = r.filter((f) => PENDING.includes(f.stage));
    else if (stage !== 'All') r = r.filter((f) => f.stage === stage);
    if (branch !== 'All') r = r.filter((f) => f.branchId === branch);
    if (type !== 'All') r = r.filter((f) => f.loanType === type);
    const q = query.toLowerCase();
    if (q) r = r.filter((f) => f.id.toLowerCase().includes(q) || f.borrower.toLowerCase().includes(q) || f.dsaFirm.toLowerCase().includes(q) || f.officerName.toLowerCase().includes(q));
    return r;
  }, [loanFiles, stage, branch, type, query]);
  const table = useSortableTable(rows, 'daysAtStage', 'desc', 15);

  useEffect(() => {
    if (location.state?.stage) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.state]);

  const stuck = (f) => f.daysAtStage > SLA[f.stage] * 1.5 && SLA[f.stage] > 0;
  const warn = (f) => f.daysAtStage > SLA[f.stage] && SLA[f.stage] > 0;

  // bottlenecks
  const bottlenecks = useMemo(() => {
    const out = [];
    const stuckUR = loanFiles.filter((f) => f.stage === 'Under Review' && f.daysAtStage >= 10);
    if (stuckUR.length) out.push({ sev: 'danger', text: `${stuckUR.length} files stuck in Under Review for 10+ days (${formatCurrency(stuckUR.reduce((a, f) => a + f.amount, 0))})`, action: () => setStage('Under Review') });
    const byBranch = {};
    loanFiles.filter((f) => f.stage === 'Rejected').forEach((f) => { byBranch[f.branchName] = (byBranch[f.branchName] || 0) + 1; });
    const worst = Object.entries(byBranch).map(([n, c]) => [n, c / loanFiles.filter((f) => f.branchName === n).length]).sort((a, b) => b[1] - a[1])[0];
    if (worst && worst[1] > 0.15) out.push({ sev: 'warning', text: `${worst[0]} has a ${Math.round(worst[1] * 100)}% rejection rate — review DSA file quality`, action: () => setStage('Rejected') });
    const inc = loanFiles.filter((f) => f.stage === 'Incomplete');
    if (inc.length) out.push({ sev: 'warning', text: `${inc.length} incomplete files awaiting documents (${formatCurrency(inc.reduce((a, f) => a + f.amount, 0))})`, action: () => setStage('Incomplete') });
    const approvedIdle = loanFiles.filter((f) => f.stage === 'Approved' && f.daysAtStage > 5);
    if (approvedIdle.length) out.push({ sev: 'info', text: `${approvedIdle.length} approved files not yet disbursed after 5+ days`, action: () => setStage('Approved') });
    return out;
  }, [loanFiles]);

  const columns = [
    { key: 'id', label: 'File ID', strong: true, num: true },
    { key: 'borrower', label: 'Borrower' },
    { key: 'loanType', label: 'Loan Type', render: (f) => <span className="flex items-center gap-2"><span className="dot" style={{ background: PRODUCT_COLORS[f.loanType] }} />{f.loanType}</span> },
    { key: 'amount', label: 'Amount', align: 'right', num: true, strong: true, render: (f) => formatCurrency(f.amount) },
    { key: 'dsaFirm', label: 'DSA' },
    { key: 'branchName', label: 'Branch' },
    { key: 'stage', label: 'Stage', render: (f) => <Badge variant={STAGE_BADGE[f.stage]}>{f.stage}</Badge> },
    { key: 'daysAtStage', label: 'Days at Stage', align: 'right', num: true, render: (f) => <span className={stuck(f) ? 'text-danger' : warn(f) ? 'text-warning' : ''} style={{ fontWeight: stuck(f) || warn(f) ? 700 : 400 }}>{f.daysAtStage}d{stuck(f) && ' ⚠'}</span> },
    { key: 'officerName', label: 'Officer' },
    { key: 'submittedAt', label: 'Submitted', render: (f) => formatDate(f.submittedAt) },
  ];

  return (
    <>
      <Breadcrumb />

      {/* Visual funnel */}
      <Card title="Loan Pipeline Funnel" description="Cumulative file counts by stage with drop-off between stages" actions={<Button variant="ghost" size="sm" icon={<FiDownload />} onClick={() => toast('Funnel exported (prototype)')}>Export</Button>}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          {funnel.map((f, i) => {
            const prev = funnel[i - 1];
            const drop = prev ? ((prev.count - f.count) / (prev.count || 1)) * 100 : null;
            const widthPct = 100 - i * 14;
            return (
              <div key={f.stage} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <div style={{ width: 70, textAlign: 'center', flexShrink: 0 }}>
                    <FiArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: drop > 25 ? 'var(--danger)' : 'var(--text-secondary)' }}>−{drop.toFixed(0)}%</div>
                  </div>
                )}
                <div onClick={() => setStage(f.stage)} style={{ flex: 1, cursor: 'pointer', background: f.color, color: '#fff', borderRadius: 8, padding: '18px 14px', height: `${60 + widthPct * 0.7}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'transform 150ms', animation: `fadeUp 400ms ${i * 90}ms both` }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9 }}>{f.stage}</div>
                  <div className="num" style={{ fontSize: 28, fontWeight: 800 }}>{formatIndian(f.count)}</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>{formatCurrency(f.atStage.reduce((a, x) => a + x.amount, 0))} at this stage</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stage cards */}
      <div className="grid grid-4">
        {funnel.map((f, i) => {
          const atStage = f.atStage;
          const avg = atStage.length ? atStage.reduce((a, x) => a + x.daysAtStage, 0) / atStage.length : 0;
          const stuckN = atStage.filter(stuck).length;
          const trend = ((i * 7 + 13) % 19) - 9;
          return (
            <StatusCard key={f.stage} index={i} color={STAGE_CARD[f.stage]} label={f.stage} value={formatIndian(atStage.length)} helper={`Avg ${avg.toFixed(1)} days at stage`}
              onClick={() => setStage(f.stage)}
              extra={<div className="flex justify-between items-center mt-2" style={{ fontSize: 12 }}>
                <span className={stuckN > 3 ? 'text-danger' : 'muted'} style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiClock size={12} /> {stuckN} stuck</span>
                <Trend value={trend} />
              </div>} />
          );
        })}
      </div>

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div className="grid grid-2">
          {bottlenecks.map((b, i) => (
            <div key={i} className="card fade-up" style={{ borderLeft: `4px solid var(--${b.sev})`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '14px 16px' }} onClick={b.action}>
              <FiAlertTriangle size={20} style={{ color: `var(--${b.sev})`, flexShrink: 0 }} />
              <div style={{ fontSize: 12, fontWeight: 500 }}>{b.text}</div>
              <FiArrowRight style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div ref={tableRef} style={{ scrollMarginTop: 16 }} />
      <Card animate={false} title="Pipeline Files" description={`${rows.length} files · rows in amber exceed SLA, red are stuck`} actions={<Button variant="ghost" size="sm" icon={<FiDownload />} onClick={() => toast('Pipeline exported (prototype)')}>Export</Button>}>
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <select className="input select" value={stage} onChange={(e) => { setStage(e.target.value); table.setPage(1); }}>
            <option value="All">All stages</option>
            <option value="Pending">Pending (Submitted + Under Review)</option>
            {['Submitted', 'Under Review', 'Approved', 'Disbursed', 'Rejected', 'Incomplete'].map((s) => <option key={s}>{s}</option>)}
          </select>
          {level !== 'branch' && level !== 'officer' && (
            <select className="input select" value={branch} onChange={(e) => { setBranch(e.target.value); table.setPage(1); }}>
              <option value="All">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select className="input select" value={type} onChange={(e) => { setType(e.target.value); table.setPage(1); }}>
            <option value="All">All loan types</option>
            {Object.keys(PRODUCT_COLORS).map((t) => <option key={t}>{t}</option>)}
          </select>
          <span className="spacer" />
          <SearchBar value={query} onChange={setQuery} placeholder="File ID, borrower, DSA, officer..." style={{ width: 280 }} />
        </div>
        <DataTable columns={columns} rows={table.paged} sort={table} compact rowClass={(f) => (stuck(f) ? 'row-danger' : warn(f) ? 'row-warn' : '')} onRowClick={(f) => toast(`${f.id} · ${f.borrower} · ${f.stage}`, 'info')} />
        <Pagination table={table} />
      </Card>
    </>
  );
}
