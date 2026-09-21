import regions from '@/data/regions.json';
import states from '@/data/states.json';
import branches from '@/data/branches.json';
import officers from '@/data/officers.json';
import dsas from '@/data/dsas.json';
import loanFiles from '@/data/loanFiles.json';
import months from '@/data/months.json';

import { dsaAreaName } from '@/scope/areas';

export const DATA = { regions, states, branches, officers, dsas, loanFiles, months };

export const LEVELS = ['national', 'regional', 'state', 'branch', 'officer'];
export const LEVEL_LABEL = { national: 'National', regional: 'Region', state: 'State', branch: 'Branch', officer: 'Officer' };
/** What child unit a level drills into */
export const CHILD_LEVEL = { national: 'regional', regional: 'state', state: 'branch', branch: 'officer' };
export const CHILD_LABEL = { national: 'Regions', regional: 'States', state: 'Branches', branch: 'Officers', officer: '' };

export const regionById = (id) => regions.find((r) => r.id === id);
export const stateById = (id) => states.find((s) => s.id === id);
export const branchById = (id) => branches.find((b) => b.id === id);
export const officerById = (id) => officers.find((o) => o.id === id);

/** Generic "does this record fall inside scope" test — works for branches, officers, dsas, loanFiles */
export function inScope(rec, scope) {
  if (!scope || scope.level === 'national') return true;
  if (scope.officerId) return rec.officerId === scope.officerId || rec.id === scope.officerId;
  if (scope.branchId) return rec.branchId === scope.branchId || rec.id === scope.branchId;
  if (scope.stateId) return rec.stateId === scope.stateId;
  if (scope.regionId) return rec.regionId === scope.regionId;
  return true;
}

export const branchesIn = (scope) => branches.filter((b) => inScope(b, scope));
export const officersIn = (scope) => officers.filter((o) => inScope(o, scope));
export const dsasIn = (scope) => dsas.filter((d) => inScope(d, scope));
export const filesIn = (scope) => loanFiles.filter((f) => inScope(f, scope));
export const statesIn = (scope) => {
  if (!scope || scope.level === 'national') return states;
  if (scope.stateId) return states.filter((s) => s.id === scope.stateId);
  if (scope.regionId) return states.filter((s) => s.regionId === scope.regionId);
  return states;
};

export function scopeName(scope) {
  if (!scope || scope.level === 'national') return 'All India';
  if (scope.level === 'officer') return officerById(scope.officerId)?.name;
  if (scope.level === 'branch') return branchById(scope.branchId)?.name + ' Branch';
  if (scope.level === 'state') return stateById(scope.stateId)?.name;
  if (scope.level === 'regional') return regionById(scope.regionId)?.name;
  return '';
}

/** Sum of key metrics for a set of branches */
export function aggregateBranches(list) {
  const sum = (k) => list.reduce((a, b) => a + (b[k] || 0), 0);
  const officerCount = officers.filter((o) => list.some((b) => b.id === o.branchId)).length;
  const target = sum('monthlyTarget');
  const disb = sum('monthlyDisbursement');
  return {
    branchCount: list.length,
    officerCount,
    monthlyTarget: target,
    monthlyDisbursement: disb,
    quarterTarget: sum('quarterTarget'),
    quarterDisbursement: sum('quarterDisbursement'),
    targetPct: target ? +((disb / target) * 100).toFixed(1) : 0,
    filesSubmitted: sum('filesSubmitted'),
    filesApproved: sum('filesApproved'),
    activeDsas: sum('activeDsas'),
    totalDsas: sum('totalDsas'),
    newDsasThisMonth: sum('newDsasThisMonth'),
    trend: months.slice(-6).map((_, i) => list.reduce((a, b) => a + b.trend[i], 0)),
  };
}

/** Monthly series aggregated across the given branches */
export function aggregateMonthly(list) {
  return months.map((m, i) => {
    const agg = { month: m.key, label: m.label, disbursement: 0, target: 0, submitted: 0, approved: 0, rejected: 0, disbursedCount: 0, activeDsas: 0, commission: 0, incentive: 0 };
    list.forEach((b) => { const x = b.monthly[i]; for (const k of Object.keys(agg)) if (typeof agg[k] === 'number') agg[k] += x[k]; });
    return agg;
  });
}

/**
 * Rows for the drill-down table: the child units of the current scope.
 * Every row has the same shape regardless of level.
 */
export function childUnits(scope) {
  const level = scope?.level || 'national';
  if (level === 'national') {
    return regions.map((r) => unitRow('regional', r.id, r.name, `${r.stateIds.length} states`, branches.filter((b) => b.regionId === r.id), r.head));
  }
  if (level === 'regional') {
    return statesIn(scope).map((s) => unitRow('state', s.id, s.name, regionById(s.regionId).name, branches.filter((b) => b.stateId === s.id), s.head));
  }
  if (level === 'state') {
    return branchesIn(scope).map((b) => unitRow('branch', b.id, b.name, b.city, [b], b.head));
  }
  if (level === 'branch') {
    return officersIn(scope).map((o) => ({
      level: 'officer', id: o.id, name: o.name, location: o.branchName, head: o.name,
      officerCount: 1, activeDsas: o.dsaCount, filesSubmitted: o.filesSubmitted, filesApproved: o.filesApproved,
      monthlyDisbursement: o.monthlyDisbursement, monthlyTarget: o.monthlyTarget, targetPct: o.targetPct, trend: o.trend,
      status: o.status, visitsToday: o.visitsToday, raw: o,
    }));
  }
  return [];
}

function unitRow(level, id, name, location, list, head) {
  const a = aggregateBranches(list);
  return { level, id, name, location, head, ...a, raw: list.length === 1 ? list[0] : null };
}

/**
 * Focus filter inside a branch: one area, one officer or one DSA.
 * focus = { type: 'area' | 'officer' | 'dsa', id }
 * Returns the narrowed datasets plus an agg / monthly series scaled to the focus,
 * so every KPI, chart and table on the page reflects the slice.
 */
export function applyFocus(focus, base) {
  if (!focus) return base;
  const { branches: bl, officers: ol, dsas: dl, loanFiles: fl } = base;
  let dsasF, officersF;
  if (focus.type === 'officer') { officersF = ol.filter((o) => o.id === focus.id); dsasF = dl.filter((d) => d.officerId === focus.id); }
  else if (focus.type === 'dsa') { dsasF = dl.filter((d) => d.id === focus.id); officersF = ol.filter((o) => dsasF.some((d) => d.officerId === o.id)); }
  else { dsasF = dl.filter((d) => dsaAreaName(d) === focus.id); officersF = ol.filter((o) => dsasF.some((d) => d.officerId === o.id)); }
  const dsaIds = new Set(dsasF.map((d) => d.id));
  const filesF = focus.type === 'officer' ? fl.filter((f) => f.officerId === focus.id) : fl.filter((f) => dsaIds.has(f.dsaId));

  // money: an officer has its own monthly numbers; a DSA / area takes its share of the branch month,
  // sized by its DSAs' lifetime disbursement against all the branch's DSAs. Everything else scales by that share.
  const branchDisb = Math.max(1, base.agg.monthlyDisbursement);
  const sumDisb = (list) => list.reduce((a, d) => a + d.disbursement, 0);
  const share = Math.min(1, focus.type === 'officer' ? (officersF[0]?.monthlyDisbursement || 0) / branchDisb : sumDisb(dsasF) / Math.max(1, sumDisb(dl)));
  const disb = focus.type === 'officer' ? (officersF[0]?.monthlyDisbursement || 0) : Math.round(branchDisb * share);
  const target = focus.type === 'officer' ? (officersF[0]?.monthlyTarget || 0) : Math.round(base.agg.monthlyTarget * share);
  const sc = (v) => Math.round(v * share);
  const agg = {
    ...base.agg, officerCount: officersF.length, monthlyDisbursement: disb, monthlyTarget: target,
    quarterDisbursement: sc(base.agg.quarterDisbursement), quarterTarget: sc(base.agg.quarterTarget),
    targetPct: target ? +((disb / target) * 100).toFixed(1) : 0,
    filesSubmitted: dsasF.reduce((a, d) => a + d.files, 0), filesApproved: dsasF.reduce((a, d) => a + d.approved, 0),
    activeDsas: dsasF.filter((d) => d.quality !== 'Inactive').length, totalDsas: dsasF.length,
    newDsasThisMonth: dsasF.filter((d) => (new Date('2026-09-18') - new Date(d.onboardedAt)) / 86400000 <= 30).length,
    trend: base.agg.trend.map(sc),
  };
  const monthly = base.monthly.map((m, i) => {
    const last = i === base.monthly.length - 1;
    const row = {};
    for (const k of Object.keys(m)) row[k] = typeof m[k] === 'number' ? sc(m[k]) : m[k];
    if (last) { row.disbursement = disb; row.target = target; row.activeDsas = agg.activeDsas; }
    return row;
  });
  const children = base.children.filter((c) => officersF.some((o) => o.id === c.id)).map((c) => (focus.type === 'officer' ? c : { ...c, activeDsas: dsasF.filter((d) => d.officerId === c.id).length }));
  return { ...base, branches: bl, officers: officersF, dsas: dsasF, loanFiles: filesF, agg, monthly, children };
}

/** Human label for a focus */
export function focusLabel(focus) {
  if (!focus) return '';
  if (focus.type === 'officer') return officerById(focus.id)?.name || focus.id;
  if (focus.type === 'dsa') return dsas.find((d) => d.id === focus.id)?.firm || focus.id;
  return focus.id;
}

/** Rank rows by a metric, descending */
export function ranked(rows, key = 'monthlyDisbursement') {
  return [...rows].sort((a, b) => (b[key] || 0) - (a[key] || 0)).map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Build the scope object for a drill target */
export function scopeFor(level, id, current = {}) {
  switch (level) {
    case 'national': return { level: 'national' };
    case 'regional': return { level: 'regional', regionId: id };
    case 'state': { const s = stateById(id); return { level: 'state', regionId: s.regionId, stateId: id }; }
    case 'branch': { const b = branchById(id); return { level: 'branch', regionId: b.regionId, stateId: b.stateId, branchId: id }; }
    case 'officer': { const o = officerById(id); return { level: 'officer', regionId: o.regionId, stateId: o.stateId, branchId: o.branchId, officerId: id }; }
    default: return current;
  }
}

export function breadcrumbsFor(scope, rootLevel = 'national') {
  const crumbs = [{ label: 'All India', level: 'national', id: null }];
  if (scope.regionId) crumbs.push({ label: regionById(scope.regionId).name, level: 'regional', id: scope.regionId });
  if (scope.stateId) crumbs.push({ label: stateById(scope.stateId).name, level: 'state', id: scope.stateId });
  if (scope.branchId) crumbs.push({ label: branchById(scope.branchId).name, level: 'branch', id: scope.branchId });
  if (scope.officerId) crumbs.push({ label: officerById(scope.officerId).name, level: 'officer', id: scope.officerId });
  const rootIdx = LEVELS.indexOf(rootLevel);
  return crumbs.filter((c) => LEVELS.indexOf(c.level) >= rootIdx);
}

/** Summary text like "6 states, 147 branches, 735 officers" */
export function scopeSummary(scope) {
  const bl = branchesIn(scope);
  const parts = [];
  if (!scope || scope.level === 'national') parts.push(`${regions.length} regions`);
  if (!scope || ['national', 'regional'].includes(scope.level)) parts.push(`${statesIn(scope).length} states`);
  if (scope?.level !== 'branch' && scope?.level !== 'officer') parts.push(`${bl.length} branches`);
  parts.push(`${officersIn(scope).length} officers`);
  return parts.join(', ');
}
