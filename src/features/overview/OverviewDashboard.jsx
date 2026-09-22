import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiSliders } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import Breadcrumb from '@/scope/Breadcrumb';
import FocusBar from '@/scope/FocusBar';
import SmartInsightsBar from '@/features/overview/SmartInsightsBar';
import { Card, KPICard, StatusCard, ChartTableToggle, PillToggle, IconButton, Badge, Avatar, Trend, Button } from '@/shared/ui';
import { OfficerProductivityTable } from '@/features/officers/OfficerProductivityTable';
import OfficerDetailPanel from '@/features/officers/OfficerDetailPanel';
import { useAuth } from '@/features/auth/AuthContext';
import { packRows, sectionsFor, widgetsFor, isWidgetId } from '@/features/overview/overviewSections';
import CustomWidget from '@/features/widgets/CustomWidget';
import { AreaChart, BarChart, FunnelChart, ChartLegend, ChartTooltip } from '@/shared/charts';
import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, CartesianGrid } from 'recharts';
import { useScope } from '@/scope/useScope';
import { useDateRange } from '@/shared/hooks/useDateRange';
import { useToast } from '@/shared/context/ToastContext';
import { useTheme } from '@/shared/context/ThemeContext';
import { formatCurrency, formatIndian, formatAxis } from '@/shared/utils/formatCurrency';
import { relativeTime } from '@/shared/utils/formatNumber';
import { perfBarColor, perfClass } from '@/shared/utils/performanceColor';
import { PRODUCT_COLORS, COLORS } from '@/shared/utils/colors';
import { ranked, CHILD_LABEL } from '@/scope/scopeHelpers';
import notifications from '@/data/notifications.json';
import activity from '@/data/activity.json';

const pctChange = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : 0);

export default function OverviewDashboard() {
  const scope = useScope();
  const { agg, monthly, loanFiles, children, level, currentScope, drillDown, officers } = scope;
  const { user } = useAuth();
  const { scale, sliceMonths, periodLabel, rangeId } = useDateRange();
  const toast = useToast();
  const { prefs } = useTheme();
  const navigate = useNavigate();
  const [insightView, setInsightView] = useState(null);
  const [portfolioView, setPortfolioView] = useState('chart');
  const [trendView, setTrendView] = useState('chart');
  const [trendRange, setTrendRange] = useState('12');
  const [officer, setOfficer] = useState(null);
  const sections = sectionsFor(prefs, user?.id);
  const widgets = widgetsFor(prefs, user?.id);
  const widgetById = Object.fromEntries(widgets.map((w) => [w.id, w]));

  // ---------- KPI numbers ----------
  const cur = monthly[11], prev = monthly[10];
  const periodMonths = sliceMonths(monthly);
  const disbursement = rangeId === 'lastMonth' ? prev.disbursement : periodMonths.length > 1 ? periodMonths.reduce((a, m) => a + m.disbursement, 0) : scale(cur.disbursement);
  const target = rangeId === 'lastMonth' ? prev.target : periodMonths.length > 1 ? periodMonths.reduce((a, m) => a + m.target, 0) : scale(cur.target);
  const targetPct = target ? (disbursement / target) * 100 : 0;
  const activeFiles = loanFiles.filter((f) => !['Disbursed', 'Rejected'].includes(f.stage));

  // ---------- status cards ----------
  const byStage = useMemo(() => {
    const g = {};
    loanFiles.forEach((f) => { g[f.stage] = g[f.stage] || { count: 0, amount: 0 }; g[f.stage].count++; g[f.stage].amount += f.amount; });
    const get = (...st) => st.reduce((a, s) => ({ count: a.count + (g[s]?.count || 0), amount: a.amount + (g[s]?.amount || 0) }), { count: 0, amount: 0 });
    return { pending: get('Submitted', 'Under Review'), approved: get('Approved'), rejected: get('Rejected'), disbursed: get('Disbursed'), incomplete: get('Incomplete') };
  }, [loanFiles]);

  // ---------- funnel ----------
  const received = loanFiles.length;
  const underReview = loanFiles.filter((f) => !['Submitted', 'Incomplete'].includes(f.stage)).length;
  const approvedN = byStage.approved.count + byStage.disbursed.count;
  const disbursedN = byStage.disbursed.count;
  const funnel = [
    { label: 'Received (decided or waiting)', value: received, color: '#4a5b73' },
    { label: 'Decided', value: underReview, color: '#2563EB' },
    { label: 'Approved (drawn or not)', value: approvedN, color: '#16A34A' },
    { label: 'Disbursed', value: disbursedN, color: '#0891B2' },
  ];

  // ---------- portfolio by product ----------
  const portfolio = useMemo(() => Object.keys(PRODUCT_COLORS).map((type) => {
    const fs = loanFiles.filter((f) => f.loanType === type && ['Approved', 'Disbursed'].includes(f.stage));
    return { label: type.replace(' Loan', ''), type, count: fs.length, amount: fs.reduce((a, f) => a + f.amount, 0) };
  }), [loanFiles]);

  const trendData = trendRange === '12' ? monthly : monthly.slice(-6);

  // ---------- target vs achievement (child units) ----------
  const tva = useMemo(() => ranked(children, 'monthlyDisbursement').slice(0, 12).map((u) => ({
    name: u.name, target: u.monthlyTarget, actual: u.monthlyDisbursement, pct: u.targetPct, level: u.level, id: u.id,
  })), [children]);

  // ---------- top performers & alerts ----------
  const top = ranked(children, 'targetPct').slice(0, 5);
  const alerts = notifications.filter((n) => n.status === 'open' && inScopeAlert(n, currentScope)).slice(0, 6);
  const feed = activity.filter((a) => !currentScope.branchId || a.branchId === currentScope.branchId || level !== 'branch').slice(0, 6);

  const exportToast = (what) => toast(`${what} exported (prototype)`);

  const blocks = {
    insights: () => (
      <>
        {prefs.extendedFeatures !== false && <SmartInsightsBar view={insightView} onChangeView={setInsightView} onAnalyze={() => { setInsightView('board'); toast('Insight generated from current scope', 'info'); }} />}
        
              {insightView && <InsightPanel view={insightView} scope={scope} disbursement={disbursement} targetPct={targetPct} top={top} onClose={() => setInsightView(null)} />}
      </>
    ),
    kpis: () => (
      <div className="grid grid-4">
        <KPICard index={0} accent="purple" label="Total Disbursement" value={formatCurrency(disbursement)} helper={`Disbursed ${periodLabel}`} delta={pctChange(cur.disbursement, prev.disbursement)} />
        <KPICard index={1} accent="blue" label="Active Loan Files" value={formatIndian(activeFiles.length)} helper="File.stage = Submitted / Under Review / Approved" delta={pctChange(cur.submitted, prev.submitted)} />
        <KPICard index={2} accent="green" label="DSA Network" value={`${formatIndian(agg.activeDsas)} active`} helper={`${agg.newDsasThisMonth} new this month`} delta={pctChange(cur.activeDsas, prev.activeDsas)} />
        <KPICard index={3} accent="amber" label="Target Achievement" value={`${targetPct.toFixed(0)}%`} helper={`Against ${periodLabel === 'this month' ? 'monthly' : periodLabel.replace('this ', '')} target`} delta={targetPct - (prev.target ? (prev.disbursement / prev.target) * 100 : 0)} />
      </div>
    ),
    summary: () => (
      <div className="flex-col" style={{ gap: 12 }}>
        <div className="flex items-end justify-between">
          <div><h2 className="section-title">Application summary</h2><p className="section-desc">Every loan file in the current scope, by how many and by how much. Counts match the page each tile opens.</p></div>
          <span className="muted" style={{ fontSize: 12 }}>Still in pipeline: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(byStage.pending.amount + byStage.incomplete.amount)}</b></span>
        </div>
        <div className="grid grid-5">
          <StatusCard index={0} color="orange" label="Pending Files" value={formatIndian(byStage.pending.count)} helper={<><b>{formatCurrency(byStage.pending.amount)}</b> applied for</>} onClick={() => navigate('/pipeline', { state: { stage: 'Pending' } })} />
          <StatusCard index={1} color="green" label="Approved Files" value={formatIndian(byStage.approved.count)} helper={<><b>{formatCurrency(byStage.approved.amount)}</b> sanctioned, awaiting disbursement</>} onClick={() => navigate('/pipeline', { state: { stage: 'Approved' } })} />
          <StatusCard index={2} color="red" label="Rejected Files" value={formatIndian(byStage.rejected.count)} helper={<><b>{formatCurrency(byStage.rejected.amount)}</b> declined</>} onClick={() => navigate('/pipeline', { state: { stage: 'Rejected' } })} />
          <StatusCard index={3} color="blue" label="Disbursed" value={formatIndian(byStage.disbursed.count)} helper={<><b>{formatCurrency(byStage.disbursed.amount)}</b> disbursed</>} onClick={() => navigate('/pipeline', { state: { stage: 'Disbursed' } })} />
          <StatusCard index={4} color="orange" label="Incomplete" value={formatIndian(byStage.incomplete.count)} helper={<><b>{formatCurrency(byStage.incomplete.amount)}</b> awaiting documents</>} onClick={() => navigate('/pipeline', { state: { stage: 'Incomplete' } })} />
        </div>
      </div>
    ),
    funnel: () => (
      <Card title="Where files are lost" description="Received through to money out of the door. The widest drop is the one to work on." actions={<IconButton title="Download" onClick={() => exportToast('Funnel chart')}><FiDownload size={15} /></IconButton>}>
        <FunnelChart stages={funnel} />
        <div className="chart-stats">
          <div><div className="cs-label">Approval rate</div><div className="cs-value num text-success">{received ? ((approvedN / received) * 100).toFixed(1) : 0}%</div></div>
          <div><div className="cs-label">Reached disbursement</div><div className="cs-value num text-info">{approvedN ? ((disbursedN / approvedN) * 100).toFixed(1) : 0}%</div></div>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}><b>{approvedN}</b> files have been approved in all — the tiles split that between <b>{byStage.approved.count}</b> awaiting disbursement and <b>{disbursedN}</b> already disbursed, so each tile matches the page it opens.</p>
      </Card>
    ),
    decisions: () => (
      <Card title="Decisions by month" description="Keyed on the month a file was received, so a backlog forming is visible rather than smoothed away." actions={<IconButton title="Download" onClick={() => exportToast('Decisions chart')}><FiDownload size={15} /></IconButton>}>
        <BarChart data={monthly} series={[{ key: 'approved', label: 'Approved', color: COLORS.success }, { key: 'rejected', label: 'Rejected', color: COLORS.danger }]} formatter={(v) => formatIndian(v)} yFormatter={(v) => formatIndian(v)} height={230} />
        <ChartLegend items={[{ label: 'Approved', color: COLORS.success }, { label: 'Rejected', color: COLORS.danger }]} />
      </Card>
    ),
    portfolio: () => (
      <Card title="Portfolio by Product" description="Sanctioned & disbursed amount by loan type"
        actions={<><span className="pill" style={{ height: 26, fontSize: 12, cursor: 'default' }}>Active portfolio</span><ChartTableToggle value={portfolioView} onChange={setPortfolioView} /></>}>
        {portfolioView === 'chart' ? (
          <BarChart data={portfolio} series={[{ key: 'amount', label: 'Amount' }]} colorBy={(d) => PRODUCT_COLORS[d.type]} height={260} />
        ) : (
          <div className="table-wrap"><table className="table compact">
            <thead><tr><th>Product</th><th className="td-right">Files</th><th className="td-right">Amount</th><th className="td-right">Share</th></tr></thead>
            <tbody>{portfolio.map((p) => {
              const total = portfolio.reduce((a, x) => a + x.amount, 0);
              return (<tr key={p.type}><td><span className="dot" style={{ background: PRODUCT_COLORS[p.type], marginRight: 8 }} />{p.type}</td><td className="td-right num">{p.count}</td><td className="td-right num td-strong">{formatCurrency(p.amount)}</td><td className="td-right num">{total ? ((p.amount / total) * 100).toFixed(1) : 0}%</td></tr>);
            })}</tbody>
          </table></div>
        )}
      </Card>
    ),
    trend: () => (
      <Card title="Disbursement Trend" description="Monthly disbursement with target line"
        actions={<><PillToggle size="sm" options={[{ id: '6', label: 'Last 6 months' }, { id: '12', label: 'Last 12 months' }]} value={trendRange} onChange={setTrendRange} /><ChartTableToggle value={trendView} onChange={setTrendView} /></>}>
        {trendView === 'chart' ? (
          <>
            <AreaChart data={trendData} yKey="disbursement" name="Disbursed" color={COLORS.brand} height={260} labelPeak={false} />
            <ChartLegend items={[{ label: 'Disbursement', color: COLORS.brand }]} />
          </>
        ) : (
          <div className="table-wrap"><table className="table compact">
            <thead><tr><th>Month</th><th className="td-right">Disbursed</th><th className="td-right">Target</th><th className="td-right">Achievement</th></tr></thead>
            <tbody>{trendData.map((m) => (<tr key={m.month}><td>{m.label} {m.month.slice(0, 4)}</td><td className="td-right num td-strong">{formatCurrency(m.disbursement)}</td><td className="td-right num">{formatCurrency(m.target)}</td><td className={`td-right num ${perfClass((m.disbursement / m.target) * 100)}`}>{((m.disbursement / m.target) * 100).toFixed(1)}%</td></tr>))}</tbody>
          </table></div>
        )}
      </Card>
    ),
    tva: () => (
      <Card title="Target vs Achievement" description={`Monthly target (grey) against actual disbursement for each ${CHILD_LABEL[level]?.toLowerCase().replace(/s$/, '') || 'unit'} — click a bar to drill down`}
        actions={<IconButton title="Download" onClick={() => exportToast('Target vs Achievement')}><FiDownload size={15} /></IconButton>}>
        {tva.length ? (
          <ResponsiveContainer width="100%" height={Math.max(180, tva.length * 44)}>
            <RBarChart data={tva} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }} barCategoryGap={10} barGap={2}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={formatAxis} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={150} />
              <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} cursor={{ fill: 'var(--row-hover)' }} />
              <Bar dataKey="target" name="Target" fill="#e2dff0" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="actual" name="Actual" radius={[0, 4, 4, 0]} barSize={12} onClick={(d) => { const p = d?.payload || d; if (p?.level && level !== 'officer') drillDown(p.level, p.id); }} style={{ cursor: 'pointer' }}>
                {tva.map((d, i) => <Cell key={i} fill={perfBarColor(d.pct)} />)}
                <LabelList dataKey="pct" position="right" formatter={(v) => `${Number(v).toFixed(0)}%`} style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text-primary)' }} />
              </Bar>
            </RBarChart>
          </ResponsiveContainer>
        ) : <p className="muted">No child units at this level.</p>}
        <ChartLegend items={[{ label: 'Target', color: '#e2dff0' }, { label: '≥ 80%', color: '#16A34A' }, { label: '60 – 80%', color: '#D97706' }, { label: '< 60%', color: '#DC2626' }]} />
      </Card>
    ),
    alerts: () => (
      <Card title="Alerts & Attention Needed" description="Open alerts inside the current scope">
        {alerts.length ? alerts.map((a) => (
          <div className="list-row" key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(a.link)}>
            <span className="dot" style={{ background: a.severity === 'critical' ? COLORS.danger : a.severity === 'warning' ? COLORS.warning : COLORS.info, width: 10, height: 10 }} />
            <div className="flex-1">
              <div style={{ fontSize: 12, fontWeight: 500 }}>{a.message}</div>
              <div className="muted" style={{ fontSize: 12 }}>{a.source} · {relativeTime(a.time)}</div>
            </div>
          </div>
        )) : <p className="muted">No open alerts in this scope.</p>}
        <div style={{ marginTop: 14 }}><button className="link" onClick={() => navigate('/alerts')}>View All Alerts →</button></div>
      </Card>
    ),
    top: () => (
      <Card title="Top Performers" description={`Highest target achievement among ${CHILD_LABEL[level]?.toLowerCase() || 'units'}`}>
        {top.length ? top.map((u, i) => (
          <div className="list-row" key={u.id} style={{ cursor: level !== 'officer' ? 'pointer' : 'default' }} onClick={() => level !== 'officer' && drillDown(u.level, u.id)}>
            <span className={`rank r${i + 1}`}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
            <Avatar name={u.name} size={30} color={i === 0 ? '#D97706' : i === 1 ? '#9b8fbb' : i === 2 ? '#CD7F32' : undefined} />
            <div className="flex-1">
              <div style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{u.location} · {formatCurrency(u.monthlyDisbursement)} this month</div>
            </div>
            <Badge variant={u.targetPct >= 80 ? 'success' : u.targetPct >= 60 ? 'warning' : 'danger'}>{u.targetPct.toFixed(0)}%</Badge>
            <Trend value={pctChange(u.trend[5], u.trend[4])} />
          </div>
        )) : <p className="muted">No child units at this level.</p>}
        <div style={{ marginTop: 14 }}><button className="link" onClick={() => navigate('/leaderboard')}>Full Leaderboard →</button></div>
      </Card>
    ),
    productivity: () => (
      <Card title="BO Productivity & Coverage" description="Coverage, visit → file, collection and customer spread per officer — click a row for the DSA-wise split">
        <OfficerProductivityTable officers={officers} pageSize={10} compact />
      </Card>
    ),
    activity: () => (
      <Card title="Recent Activity" description="Latest events across the network">
        <div className="timeline">
          {feed.map((a) => (
            <div className={`timeline-item ${a.type}`} key={a.id}>
              <div className="t-text">{a.text}</div>
              <div className="t-time">{relativeTime(a.time)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}><button className="link" onClick={() => toast('Full activity log (prototype)', 'info')}>View All →</button></div>
      </Card>
    ),
  };

  // a row slot is either a built-in block or one of the user's pivot widgets
  const render = (id) => (isWidgetId(id) ? <CustomWidget widget={widgetById[id]} /> : blocks[id]());

  return (
    <>
      <Breadcrumb trailing={<Button variant="ghost" size="sm" icon={<FiSliders />} onClick={() => navigate('/setup?from=overview')}>Customise overview</Button>} />
      <FocusBar />

      {packRows(sections, widgets).map((row, i) => (
        row.length === 2
          ? <div className="grid grid-2" key={i}>{row.map((id) => <Fragment key={id}>{render(id)}</Fragment>)}</div>
          : <Fragment key={i}>{render(row[0])}</Fragment>
      ))}

      <OfficerDetailPanel officer={officer} onClose={() => setOfficer(null)} />
    </>
  );
}

function inScopeAlert(n, scope) {
  if (!scope || scope.level === 'national') return true;
  if (scope.branchId) return n.branchId === scope.branchId || (!n.branchId && !n.stateId && !n.regionId);
  if (scope.stateId) return n.stateId === scope.stateId || (!n.stateId && !n.regionId);
  if (scope.regionId) return n.regionId === scope.regionId || !n.regionId;
  return true;
}

/** Pre-built "AI" view shown when a chip is selected */
function InsightPanel({ view, scope, disbursement, targetPct, top, onClose }) {
  const { agg, dsas, officers, level } = scope;
  const highQ = dsas.filter((d) => d.quality === 'High').length;
  const lowQ = dsas.filter((d) => d.quality === 'Low').length;
  const inactive = officers.filter((o) => o.status === 'Inactive').length;
  const meeting = officers.filter((o) => o.targetPct >= 100).length;
  const lagging = [...scope.children].sort((a, b) => a.targetPct - b.targetPct).slice(0, 3);
  const content = {
    board: {
      title: 'Board Review — key takeaways',
      bullets: [
        `Disbursement stands at ${formatCurrency(disbursement)}, ${targetPct.toFixed(0)}% of target across ${agg.branchCount} branch${agg.branchCount === 1 ? '' : 'es'} and ${agg.officerCount} officers.`,
        `${agg.activeDsas} active DSAs (${agg.newDsasThisMonth} onboarded this month); ${highQ} rated high quality, ${lowQ} low quality.`,
        top[0] ? `Best unit: ${top[0].name} at ${top[0].targetPct.toFixed(0)}% of target.` : 'No child units at this level.',
        lagging[0] ? `Needs attention: ${lagging.map((l) => `${l.name} (${l.targetPct.toFixed(0)}%)`).join(', ')}.` : '',
      ],
    },
    branch: { title: 'Branch Performance', bullets: [`${scope.branches.filter((b) => b.targetPct >= 100).length} of ${agg.branchCount} branches are above 100% of monthly target.`, `${scope.branches.filter((b) => b.targetPct < 60).length} branches are below 60% and flagged red on the map.`, lagging[0] ? `Lowest: ${lagging[0].name} at ${lagging[0].targetPct.toFixed(0)}%.` : ''] },
    dsa: { title: 'DSA Analysis', bullets: [`${dsas.length} DSAs in scope; ${Math.round((highQ / (dsas.length || 1)) * 100)}% high quality, ${Math.round((lowQ / (dsas.length || 1)) * 100)}% low quality.`, `${dsas.filter((d) => d.quality === 'Inactive').length} DSAs inactive for 60+ days — candidates for re-engagement.`, `${dsas.filter((d) => d.declining).length} DSAs show declining file volume (at-risk).`] },
    officer: { title: 'Officer Scorecard', bullets: [`${meeting} of ${officers.length} officers are meeting monthly target (${Math.round((meeting / (officers.length || 1)) * 100)}%).`, `${officers.filter((o) => o.status === 'Active').length} active in the field today, ${inactive} inactive for 24h+.`, `Average daily visits: ${(officers.reduce((a, o) => a + o.avgDailyVisits, 0) / (officers.length || 1)).toFixed(1)} against a target of 6.`] },
  }[view];
  return (
    <Card className="fade-up" style={{ borderColor: 'var(--brand-tint-2)' }}>
      <div className="flex justify-between items-center">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><HiSparkles style={{ color: '#D97706' }} /> {content.title}</h3>
        <button className="link" onClick={onClose}>Dismiss</button>
      </div>
      <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
        {content.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>Scope: {scope.scopeLabel} · {level} level · generated from prototype data</p>
    </Card>
  );
}
