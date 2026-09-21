/**
 * Dataset registry for "Build my own" widgets.
 *
 * A widget is a pivot: dataset → rows (dimension) → columns (dimension, optional) → values (measures).
 * Every dataset reads from the current scope, so the branch / area / BO / DSA filters apply automatically.
 * Adding a new data source = one more entry here; the builder and renderer need no changes.
 */
import { formatCurrency, formatIndian } from '@/shared/utils/formatCurrency';
import { dsaAreaName } from '@/scope/areas';
import { officerProductivity } from '@/features/officers/officerProductivity';

const pct = (v) => `${Math.round(v)}%`;
const num = (v) => formatIndian(Math.round(v));
const money = (v) => formatCurrency(v);
const monthOf = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { month: 'short', year: '2-digit' }) : '—');
const bucket = (v, edges, labels) => { for (let i = 0; i < edges.length; i++) if (v < edges[i]) return labels[i]; return labels[edges.length]; };
const ageBucket = (d) => bucket(d, [7, 15, 30], ['0–7 days', '8–15 days', '16–30 days', '30+ days']);

export const DATASETS = [
  {
    id: 'loanFiles', label: 'Loan files', icon: '🗂️', description: 'Every application in scope — by stage, product, officer, DSA',
    source: (s) => s.loanFiles,
    dims: [
      { id: 'stage', label: 'Stage' }, { id: 'loanType', label: 'Product' }, { id: 'officerName', label: 'Branch officer' },
      { id: 'dsaFirm', label: 'DSA' }, { id: 'month', label: 'Month received', get: (f) => monthOf(f.submittedAt) },
      { id: 'age', label: 'Days at stage', get: (f) => ageBucket(f.daysAtStage) },
    ],
    measures: [
      { id: 'count', label: 'No. of files', agg: 'count', fmt: num },
      { id: 'amount', label: 'Loan amount', agg: 'sum', field: 'amount', fmt: money },
      { id: 'avgAmount', label: 'Avg ticket size', agg: 'avg', field: 'amount', fmt: money },
      { id: 'avgDays', label: 'Avg days at stage', agg: 'avg', field: 'daysAtStage', fmt: (v) => `${Math.round(v)}d` },
    ],
  },
  {
    id: 'dsas', label: 'DSAs', icon: '👥', description: 'The DSA network — quality, area, officer, business',
    source: (s) => s.dsas,
    dims: [
      { id: 'quality', label: 'Quality' }, { id: 'officerName', label: 'Branch officer' }, { id: 'area', label: 'Area', get: dsaAreaName },
      { id: 'city', label: 'City' }, { id: 'declining', label: 'Trend', get: (d) => (d.declining ? 'Declining' : 'Stable / growing') },
      { id: 'tenure', label: 'Tenure', get: (d) => bucket((new Date('2026-09-18') - new Date(d.onboardedAt)) / 2592000000, [3, 12, 24], ['< 3 months', '3–12 months', '1–2 years', '2+ years']) },
    ],
    measures: [
      { id: 'count', label: 'No. of DSAs', agg: 'count', fmt: num },
      { id: 'files', label: 'Files sourced', agg: 'sum', field: 'files', fmt: num },
      { id: 'approved', label: 'Files approved', agg: 'sum', field: 'approved', fmt: num },
      { id: 'approvalRate', label: 'Avg approval %', agg: 'avg', field: 'approvalRate', fmt: pct },
      { id: 'disbursement', label: 'Disbursement', agg: 'sum', field: 'disbursement', fmt: money },
      { id: 'commission', label: 'Commission', agg: 'sum', field: 'commission', fmt: money },
    ],
  },
  {
    id: 'officers', label: 'Branch officers', icon: '🏃', description: 'BO sales, activity and incentive numbers',
    source: (s) => s.officers,
    dims: [
      { id: 'name', label: 'Officer' }, { id: 'status', label: 'Status today' }, { id: 'slab', label: 'Incentive slab' },
      { id: 'targetBand', label: 'Target band', get: (o) => bucket(o.targetPct, [60, 90, 100], ['< 60%', '60–90%', '90–100%', '100%+']) },
    ],
    measures: [
      { id: 'count', label: 'No. of officers', agg: 'count', fmt: num },
      { id: 'monthlyDisbursement', label: 'Disbursement', agg: 'sum', field: 'monthlyDisbursement', fmt: money },
      { id: 'monthlyTarget', label: 'Target', agg: 'sum', field: 'monthlyTarget', fmt: money },
      { id: 'targetPct', label: 'Avg target %', agg: 'avg', field: 'targetPct', fmt: pct },
      { id: 'filesSubmitted', label: 'Files submitted', agg: 'sum', field: 'filesSubmitted', fmt: num },
      { id: 'visitsWeek', label: 'Visits this week', agg: 'sum', field: 'visitsWeek', fmt: num },
      { id: 'incentiveMTD', label: 'Incentive MTD', agg: 'sum', field: 'incentiveMTD', fmt: money },
      { id: 'customersCount', label: 'Customers', agg: 'sum', field: 'customersCount', fmt: num },
    ],
  },
  {
    id: 'productivity', label: 'BO productivity', icon: '🧭', description: 'Coverage, conversion, collection and customer spread per officer',
    source: (s) => s.officers.map((o) => ({ ...o, p: officerProductivity(o) })),
    dims: [
      { id: 'name', label: 'Officer' }, { id: 'tier', label: 'Productivity tier', get: (o) => o.p.tier },
      { id: 'flag', label: 'Main red flag', get: (o) => o.p.flags[0]?.label || 'Healthy' },
    ],
    measures: [
      { id: 'count', label: 'No. of officers', agg: 'count', fmt: num },
      { id: 'score', label: 'Avg score', agg: 'avg', field: (o) => o.p.score, fmt: num },
      { id: 'coverage', label: 'Avg coverage %', agg: 'avg', field: (o) => o.p.coveragePct, fmt: pct },
      { id: 'conversion', label: 'Avg visit → file %', agg: 'avg', field: (o) => o.p.conversionPct, fmt: pct },
      { id: 'collection', label: 'Avg collection %', agg: 'avg', field: (o) => o.p.collectionPct, fmt: pct },
      { id: 'dsaVisits', label: 'DSA visits', agg: 'sum', field: 'dsaVisitsMonth', fmt: num },
      { id: 'collectionAmount', label: 'Collection recovered', agg: 'sum', field: 'collectionAmount', fmt: money },
    ],
  },
  {
    id: 'dsaVisits', label: 'DSA visits', icon: '🚶', description: 'Each officer × DSA visit record this month — who went where',
    source: (s) => s.officers.flatMap((o) => (o.dsaVisits || []).filter((v) => s.dsas.some((d) => d.id === v.dsaId)).map((v) => ({ ...v, officerName: o.name, area: dsaAreaName({ id: v.dsaId }), met: v.visits >= v.target ? 'On target' : v.visits > 0 ? 'Under target' : 'Not visited' }))),
    dims: [
      { id: 'officerName', label: 'Branch officer' }, { id: 'firm', label: 'DSA' }, { id: 'area', label: 'Area' }, { id: 'quality', label: 'DSA quality' }, { id: 'met', label: 'Visit status' },
    ],
    measures: [
      { id: 'visits', label: 'Visits', agg: 'sum', field: 'visits', fmt: num },
      { id: 'target', label: 'Visit target', agg: 'sum', field: 'target', fmt: num },
      { id: 'files', label: 'Files collected', agg: 'sum', field: 'filesCollected', fmt: num },
      { id: 'count', label: 'No. of DSAs', agg: 'count', fmt: num },
    ],
  },
  {
    id: 'monthly', label: 'Monthly trend', icon: '📈', description: 'Last 12 months for the current scope',
    source: (s) => s.monthly,
    dims: [{ id: 'label', label: 'Month' }, { id: 'quarter', label: 'Quarter', get: (m) => `Q${Math.floor(new Date(m.month + '-01').getMonth() / 3) + 1} ${m.month.slice(2, 4)}` }],
    measures: [
      { id: 'disbursement', label: 'Disbursement', agg: 'sum', field: 'disbursement', fmt: money },
      { id: 'target', label: 'Target', agg: 'sum', field: 'target', fmt: money },
      { id: 'submitted', label: 'Files received', agg: 'sum', field: 'submitted', fmt: num },
      { id: 'approved', label: 'Files approved', agg: 'sum', field: 'approved', fmt: num },
      { id: 'rejected', label: 'Files rejected', agg: 'sum', field: 'rejected', fmt: num },
      { id: 'commission', label: 'Commission', agg: 'sum', field: 'commission', fmt: money },
      { id: 'incentive', label: 'Incentive paid', agg: 'sum', field: 'incentive', fmt: money },
    ],
  },
];
export const DATASET_BY_ID = Object.fromEntries(DATASETS.map((d) => [d.id, d]));

export const WIDGET_VIEWS = [
  { id: 'table', label: 'Table', icon: '▦' }, { id: 'bar', label: 'Bar', icon: '▮' }, { id: 'stacked', label: 'Stacked bar', icon: '▤' },
  { id: 'donut', label: 'Donut', icon: '◕' }, { id: 'kpi', label: 'Number', icon: '#' },
];

const getField = (rec, f) => (typeof f === 'function' ? f(rec) : rec[f]);
const dimValue = (rec, dim) => { const v = dim.get ? dim.get(rec) : rec[dim.id]; return v === undefined || v === null || v === '' ? '—' : String(v); };

function aggregate(list, m) {
  if (m.agg === 'count') return list.length;
  const vals = list.map((r) => Number(getField(r, m.field)) || 0);
  if (m.agg === 'sum') return vals.reduce((a, b) => a + b, 0);
  if (m.agg === 'avg') return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  if (m.agg === 'max') return Math.max(0, ...vals);
  return 0;
}

/**
 * Pivot: group records by rowDim (and colDim), aggregate every measure.
 * Returns { rowKeys, colKeys, cells: { [rowKey]: { [colKey]: { [measureId]: value } } }, totals: { [rowKey]: { [measureId] } }, grand: { [measureId] } }
 * colKeys is ['*'] when no column dimension.
 */
export function pivot(allRecords, { dataset, rowDim, rowDims, colDim, measures, filters }) {
  const ds = DATASET_BY_ID[dataset];
  if (!ds) return { rowKeys: [], colKeys: [], cells: {}, totals: {}, grand: {}, measures: [] };
  const rds = (rowDims || [rowDim]).map((id) => ds.dims.find((d) => d.id === id)).filter(Boolean);
  const rd = rds[0], cd = colDim ? ds.dims.find((d) => d.id === colDim) : null;
  const ms = measures.map((id) => ds.measures.find((m) => m.id === id)).filter(Boolean);
  // filters: { dimId: [allowed values] } — an empty list means "all"
  const fl = Object.entries(filters || {}).map(([id, vals]) => [ds.dims.find((d) => d.id === id), vals]).filter(([d, vals]) => d && vals?.length);
  const records = fl.length ? allRecords.filter((r) => fl.every(([d, vals]) => vals.includes(dimValue(r, d)))) : allRecords;
  const groups = {};
  records.forEach((r) => {
    const rk = rds.length ? rds.map((d) => dimValue(r, d)).join(' · ') : 'All', ck = cd ? dimValue(r, cd) : '*';
    ((groups[rk] = groups[rk] || {})[ck] = groups[rk][ck] || []).push(r);
  });
  const rowKeys = Object.keys(groups);
  const colKeys = cd ? [...new Set(rowKeys.flatMap((rk) => Object.keys(groups[rk])))].sort() : ['*'];
  // keep months in data order rather than alphabetical
  if (rd?.id === 'label' && ds.id === 'monthly') rowKeys.sort((a, b) => records.findIndex((m) => m.label === a) - records.findIndex((m) => m.label === b));
  const cells = {}, totals = {};
  rowKeys.forEach((rk) => {
    cells[rk] = {}; const all = colKeys.flatMap((ck) => groups[rk][ck] || []);
    colKeys.forEach((ck) => { const list = groups[rk][ck] || []; cells[rk][ck] = Object.fromEntries(ms.map((m) => [m.id, list.length ? aggregate(list, m) : 0])); });
    totals[rk] = Object.fromEntries(ms.map((m) => [m.id, aggregate(all, m)]));
  });
  const grand = Object.fromEntries(ms.map((m) => [m.id, aggregate(records, m)]));
  // sort rows by first measure unless the row dim has a natural order
  if (!(rd?.id === 'label' || rd?.id === 'age' || rd?.id === 'tenure' || rd?.id === 'targetBand') && ms[0]) rowKeys.sort((a, b) => totals[b][ms[0].id] - totals[a][ms[0].id]);
  return { rowKeys, colKeys, cells, totals, grand, measures: ms, rowDim: rd, rowDims: rds, colDim: cd, filtered: records.length };
}

/** Distinct values of a dimension in the given records (for filter pickers) */
export function dimValues(records, dataset, dimId) {
  const d = DATASET_BY_ID[dataset]?.dims.find((x) => x.id === dimId);
  if (!d) return [];
  return [...new Set(records.map((r) => dimValue(r, d)))].sort();
}

/** Auto title, e.g. "Loan files · No. of files by Stage and Product" */
export function widgetTitle(w) {
  const ds = DATASET_BY_ID[w.dataset]; if (!ds) return 'Widget';
  const m = w.measures.map((id) => ds.measures.find((x) => x.id === id)?.label).filter(Boolean).join(' & ');
  const r = (w.rowDims || [w.rowDim]).map((id) => ds.dims.find((d) => d.id === id)?.label).filter(Boolean).join(' & '), c = ds.dims.find((d) => d.id === w.colDim)?.label;
  return `${m || ds.label}${r ? ` by ${r}` : ''}${c ? ` and ${c}` : ''}`;
}

export const newWidgetId = () => `w:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Ready-made widgets the lead can add in one click and then edit */
export const WIDGET_LIBRARY = [
  { title: 'Files by officer and stage', dataset: 'loanFiles', rowDims: ['officerName'], colDim: 'stage', measures: ['count'], view: 'stacked', width: 'half' },
  { title: 'Loan amount by product', dataset: 'loanFiles', rowDims: ['loanType'], colDim: '', measures: ['amount'], view: 'donut', width: 'half' },
  { title: 'DSAs by area and quality', dataset: 'dsas', rowDims: ['area'], colDim: 'quality', measures: ['count'], view: 'stacked', width: 'half' },
  { title: 'DSA business by officer', dataset: 'dsas', rowDims: ['officerName'], colDim: '', measures: ['disbursement', 'commission'], view: 'table', width: 'half' },
  { title: 'Officer target vs achievement', dataset: 'officers', rowDims: ['name'], colDim: '', measures: ['monthlyTarget', 'monthlyDisbursement'], view: 'bar', width: 'full' },
  { title: 'Who visited which area', dataset: 'dsaVisits', rowDims: ['officerName'], colDim: 'area', measures: ['visits'], view: 'table', width: 'full' },
  { title: 'Officers by productivity tier', dataset: 'productivity', rowDims: ['tier'], colDim: '', measures: ['count'], view: 'donut', width: 'half' },
  { title: 'Monthly files received vs approved', dataset: 'monthly', rowDims: ['label'], colDim: '', measures: ['submitted', 'approved'], view: 'bar', width: 'half' },
  { title: 'Total loan book in pipeline', dataset: 'loanFiles', rowDims: [], colDim: '', measures: ['amount', 'count'], view: 'kpi', width: 'half' },
];
