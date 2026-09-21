import { useMemo, useState } from 'react';
import { BRAND } from '../../config/brand';
import { motion } from 'framer-motion';
import { FiCalendar, FiClipboard, FiPieChart, FiTrendingUp, FiUsers, FiUser, FiDownload, FiMail, FiClock, FiFileText, FiPrinter } from 'react-icons/fi';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { Card, Button, PillToggle, Badge } from '../../components/common';
import { AreaChart, BarChart, FunnelChart } from '../../components/charts';
import { useScope } from '../../hooks/useScope';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatIndian } from '../../utils/formatCurrency';
import { ranked, CHILD_LABEL } from '../../utils/scopeHelpers';
import { COLORS, PRODUCT_COLORS } from '../../utils/colors';

const TEMPLATES = [
  { id: 'daily', title: 'Daily Activity', desc: 'Officer visits, DSA meetings and files logged today.', icon: FiCalendar, color: '#2563EB' },
  { id: 'weekly', title: 'Weekly Summary', desc: 'Week-on-week pipeline movement and disbursement.', icon: FiClipboard, color: '#0891B2' },
  { id: 'monthly', title: 'Monthly Review', desc: 'Target vs achievement, product mix and top units.', icon: FiPieChart, color: '#8B5CF6' },
  { id: 'quarterly', title: 'Quarterly Analysis', desc: 'Trend analysis, churn and incentive payouts.', icon: FiTrendingUp, color: '#D97706' },
  { id: 'dsa', title: 'DSA Report', desc: 'Quality distribution, at-risk and lost DSAs.', icon: FiUsers, color: '#E11D48' },
  { id: 'officer', title: 'Officer Report', desc: 'Scorecards, compliance and slab positions.', icon: FiUser, color: '#16A34A' },
];
const METRICS = ['Disbursement', 'Files & Approvals', 'DSA Network', 'Officer Activity', 'Incentives', 'Target Achievement'];
const RANGES = [{ id: 'month', label: 'This Month' }, { id: 'lastMonth', label: 'Last Month' }, { id: 'quarter', label: 'This Quarter' }, { id: 'year', label: 'This Year' }];

export default function ReportsScreen() {
  const scope = useScope();
  const { agg, monthly, loanFiles, children, dsas, officers, scopeLabel, level } = scope;
  const toast = useToast();
  const [template, setTemplate] = useState('monthly');
  const [range, setRange] = useState('month');
  const [metrics, setMetrics] = useState(new Set(METRICS.slice(0, 4)));
  const [generated, setGenerated] = useState(null);

  const t = TEMPLATES.find((x) => x.id === template);
  const toggleMetric = (m) => setMetrics((s) => { const n = new Set(s); if (n.has(m)) n.delete(m); else n.add(m); return n; });
  const generate = (id) => { if (id) setTemplate(id); setGenerated({ id: id || template, at: new Date() }); toast('Report generated'); setTimeout(() => document.getElementById('report-preview')?.scrollIntoView({ behavior: 'smooth' }), 100); };

  const portfolio = useMemo(() => Object.keys(PRODUCT_COLORS).map((type) => ({ label: type.replace(' Loan', ''), type, amount: loanFiles.filter((f) => f.loanType === type && ['Approved', 'Disbursed'].includes(f.stage)).reduce((a, f) => a + f.amount, 0) })), [loanFiles]);
  const topUnits = ranked(children, 'targetPct').slice(0, 5);
  const funnel = [
    { label: 'Received', value: loanFiles.length, color: '#0891B2' },
    { label: 'Approved', value: loanFiles.filter((f) => ['Approved', 'Disbursed'].includes(f.stage)).length, color: '#16A34A' },
    { label: 'Disbursed', value: loanFiles.filter((f) => f.stage === 'Disbursed').length, color: '#15803d' },
  ];

  return (
    <>
      <Breadcrumb />

      <div className="grid grid-3">
        {TEMPLATES.map((tp, i) => (
          <motion.div key={tp.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `3px solid ${tp.color}`, outline: template === tp.id ? '2px solid var(--brand)' : 'none' }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: `${tp.color}1f`, color: tp.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}><tp.icon /></span>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{tp.title}</div>
            <div className="muted" style={{ flex: 1 }}>{tp.desc}</div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => generate(tp.id)}>Generate</Button>
              <Button size="sm" variant="secondary" onClick={() => setTemplate(tp.id)}>Configure</Button>
            </div>
          </motion.div>
        ))}
      </div>

      <Card title="Report Builder" description="Choose a template, period, scope and the metrics to include">
        <div className="grid grid-3" style={{ alignItems: 'start' }}>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Template</div>
            <select className="input select w-full" value={template} onChange={(e) => setTemplate(e.target.value)}>{TEMPLATES.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
            <div className="label" style={{ margin: '16px 0 8px' }}>Scope</div>
            <div className="input" style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)' }}>{scopeLabel} <Badge variant="brand" style={{ marginLeft: 'auto' }}>{level}</Badge></div>
            <p className="muted mt-2" style={{ fontSize: 12 }}>Scope follows the breadcrumb. Select a region, state or branch to narrow the report.</p>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Date range</div>
            <PillToggle options={RANGES} value={range} onChange={setRange} />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Metrics</div>
            <div className="flex-col gap-2">
              {METRICS.map((m) => <label key={m} className="checkbox"><input type="checkbox" checked={metrics.has(m)} onChange={() => toggleMetric(m)} />{m}</label>)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20 }}><Button icon={<FiFileText />} onClick={() => generate()}>Generate Report</Button></div>
      </Card>

      {generated && (
        <Card animate={false} title={`${t.title} — ${scopeLabel}`} description={`${RANGES.find((r) => r.id === range).label} · generated ${generated.at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · ${metrics.size} metric groups`}
          actions={<>
            <Button variant="secondary" size="sm" icon={<FiDownload />} onClick={() => toast('PDF download started (prototype)')}>Download PDF</Button>
            <Button variant="secondary" size="sm" icon={<FiDownload />} onClick={() => toast('Excel download started (prototype)')}>Download Excel</Button>
            <Button variant="secondary" size="sm" icon={<FiMail />} onClick={() => toast('Report emailed to your inbox (prototype)')}>Email</Button>
            <Button variant="secondary" size="sm" icon={<FiClock />} onClick={() => toast('Scheduled weekly on Mondays 8 AM (prototype)')}>Schedule</Button>
            <Button variant="ghost" size="sm" icon={<FiPrinter />} onClick={() => window.print()}>Print</Button>
          </>}>
          <div id="report-preview" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="grid grid-4">
              {[['Disbursement', formatCurrency(agg.monthlyDisbursement)], ['Target achievement', `${agg.targetPct}%`], ['Files approved', formatIndian(agg.filesApproved)], ['Active DSAs', formatIndian(agg.activeDsas)]].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--input-bg)', borderRadius: 8, padding: 14 }}><div className="label" style={{ fontSize: 11 }}>{l}</div><div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{v}</div></div>
              ))}
            </div>
            {metrics.has('Disbursement') && <section><h4 className="section-title" style={{ marginBottom: 8 }}>Disbursement trend</h4><AreaChart data={monthly} yKey="disbursement" name="Disbursed" color={COLORS.teal} height={200} /></section>}
            {metrics.has('Files & Approvals') && <div className="grid grid-2"><section><h4 className="section-title" style={{ marginBottom: 8 }}>Pipeline conversion</h4><FunnelChart stages={funnel} /></section><section><h4 className="section-title" style={{ marginBottom: 8 }}>Product mix</h4><BarChart data={portfolio} series={[{ key: 'amount', label: 'Amount' }]} colorBy={(d) => PRODUCT_COLORS[d.type]} height={200} /></section></div>}
            {metrics.has('Target Achievement') && topUnits.length > 0 && (
              <section><h4 className="section-title" style={{ marginBottom: 8 }}>Top {CHILD_LABEL[level]?.toLowerCase()} by target achievement</h4>
                <table className="table compact"><thead><tr><th>#</th><th>Name</th><th>Location</th><th className="td-right">Disbursement</th><th className="td-right">Target %</th></tr></thead>
                  <tbody>{topUnits.map((u, i) => <tr key={u.id}><td>{i + 1}</td><td className="td-strong">{u.name}</td><td>{u.location}</td><td className="td-right num">{formatCurrency(u.monthlyDisbursement)}</td><td className="td-right num text-success">{u.targetPct.toFixed(1)}%</td></tr>)}</tbody></table>
              </section>
            )}
            {metrics.has('DSA Network') && <section><h4 className="section-title" style={{ marginBottom: 8 }}>DSA network</h4><p style={{ fontSize: 12, lineHeight: 1.7 }}>{dsas.length} DSAs in scope: {dsas.filter((d) => d.quality === 'High').length} high quality, {dsas.filter((d) => d.quality === 'Average').length} average, {dsas.filter((d) => d.quality === 'Low').length} low quality and {dsas.filter((d) => d.quality === 'Inactive').length} inactive (60+ days). {dsas.filter((d) => d.declining).length} DSAs are flagged at-risk due to declining file volume.</p></section>}
            {metrics.has('Officer Activity') && <section><h4 className="section-title" style={{ marginBottom: 8 }}>Officer activity</h4><p style={{ fontSize: 12, lineHeight: 1.7 }}>{officers.filter((o) => o.status === 'Active').length} of {officers.length} officers active in the field today; {officers.filter((o) => o.status === 'Inactive').length} inactive for 24h+. Average {(officers.reduce((a, o) => a + o.avgDailyVisits, 0) / (officers.length || 1)).toFixed(1)} visits per officer per day against a target of 6.</p></section>}
            {metrics.has('Incentives') && <section><h4 className="section-title" style={{ marginBottom: 8 }}>Incentives</h4><p style={{ fontSize: 12, lineHeight: 1.7 }}>Total officer incentives this month: {formatCurrency(officers.reduce((a, o) => a + o.incentiveMTD, 0))}. DSA commission: {formatCurrency(monthly[11].commission)}. {officers.filter((o) => o.slab === 'Platinum').length} officers in Platinum, {officers.filter((o) => o.slab === 'Gold').length} in Gold.</p></section>}
            <p className="muted" style={{ fontSize: 11, borderTop: '1px solid var(--border)', paddingTop: 10 }}>{BRAND.product} · Prototype data · Confidential</p>
          </div>
        </Card>
      )}
    </>
  );
}
