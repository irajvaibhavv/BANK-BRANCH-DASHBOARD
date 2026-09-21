/**
 * BO productivity model — the branch head judges an officer on *how* they work,
 * not just on incentive/disbursement:
 *   coverage   → are all assigned DSAs being visited, or is the BO favouring one or two?
 *   conversion → do DSA visits actually bring files?
 *   collection → on collection visits, how much of the due amount is recovered?
 *   fairness   → are customer visits spread out, or the same customer again and again?
 */

export const TIER_VARIANT = { High: 'success', Medium: 'warning', Low: 'danger' };
export const TIER_COLOR = { High: '#16A34A', Medium: '#D97706', Low: '#DC2626' };

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export const PERIODS = [{ id: 'week', label: 'This week' }, { id: 'month', label: 'This month' }];

/**
 * The same officer seen over one week instead of the month: every count is the
 * current week's slice (deterministic, ~22–30% of the month), DSA visit target is 1/week.
 */
export function officerForPeriod(o, period = 'month') {
  if (period !== 'week') return o;
  const share = 0.22 + (hash(o.id) % 9) * 0.01;
  const dsaVisits = (o.dsaVisits || []).map((v) => {
    const s = share + ((hash(o.id + v.dsaId) % 7) - 3) * 0.03; // some DSAs got this week's visit, some did not
    const visits = Math.max(0, Math.round(v.visits * s));
    return { ...v, visits, target: 1, filesCollected: Math.min(visits, Math.round(v.filesCollected * share)) };
  });
  const dsaVisitsMonth = dsaVisits.reduce((a, v) => a + v.visits, 0);
  const customerVisits = Math.round((o.customerVisits || 0) * share);
  const fairness = o.customerVisits ? o.uniqueCustomers / o.customerVisits : 1;
  return {
    ...o, period: 'week', dsaVisits, dsaVisitsMonth, dsaVisitTarget: dsaVisits.length,
    productiveVisits: Math.min(dsaVisitsMonth, Math.round((o.productiveVisits || 0) * share)),
    collectionVisits: Math.round((o.collectionVisits || 0) * share),
    collectionDue: Math.round((o.collectionDue || 0) * share), collectionAmount: Math.round((o.collectionAmount || 0) * share),
    customerVisits, uniqueCustomers: Math.max(customerVisits ? 1 : 0, Math.round(customerVisits * fairness)),
    visitsMonth: o.visitsWeek,
  };
}

export function officerProductivity(src, period = 'month') {
  const o = officerForPeriod(src, period);
  const dv = o.dsaVisits || [];
  const totalDsas = dv.length;
  const visited = dv.filter((d) => d.visits > 0).length;
  const onTarget = dv.filter((d) => d.visits >= d.target).length;
  const neglected = dv.filter((d) => d.visits === 0).length;
  const dsaVisits = o.dsaVisitsMonth || 0;
  const topVisits = dv.reduce((m, d) => Math.max(m, d.visits), 0);
  const topDsa = dv.find((d) => d.visits === topVisits);

  const coveragePct = pct(visited, totalDsas);
  const onTargetPct = pct(onTarget, totalDsas);
  const visitAchievementPct = pct(dsaVisits, o.dsaVisitTarget);
  const topSharePct = pct(topVisits, dsaVisits);
  const conversionPct = pct(o.productiveVisits, dsaVisits);
  const collectionPct = pct(o.collectionAmount, o.collectionDue);
  const fairnessPct = pct(o.uniqueCustomers, o.customerVisits);

  const flags = [];
  if (visitAchievementPct >= 85 && (coveragePct < 65 || topSharePct >= 45)) flags.push({ id: 'favouring', label: 'Favouring DSAs', severity: 'danger', detail: `${topSharePct}% of visits went to ${topDsa?.firm}; ${neglected} DSA${neglected === 1 ? '' : 's'} never visited` });
  else if (coveragePct < 65) flags.push({ id: 'coverage', label: 'Low coverage', severity: 'warning', detail: `Only ${visited} of ${totalDsas} DSAs visited this ${period}` });
  if (visitAchievementPct < 50) flags.push({ id: 'activity', label: 'Low activity', severity: 'danger', detail: `${dsaVisits} of ${o.dsaVisitTarget} DSA visits done` });
  if (conversionPct < 30 && dsaVisits >= 5) flags.push({ id: 'conversion', label: 'Visits not converting', severity: 'warning', detail: `${o.productiveVisits} files from ${dsaVisits} visits` });
  if (collectionPct < 60) flags.push({ id: 'collection', label: 'Collection short', severity: 'warning', detail: `${collectionPct}% of due recovered` });
  if (fairnessPct < 55) flags.push({ id: 'repeat', label: 'Repeat customers', severity: 'warning', detail: `${o.uniqueCustomers} unique customers across ${o.customerVisits} visits` });

  // 0–100 productivity score. Coverage is penalised when visits pile onto one DSA,
  // conversion saturates at 60% (6 files from 10 visits is a full mark).
  const coverageScore = Math.max(0, 0.5 * coveragePct + 0.5 * onTargetPct - Math.max(0, topSharePct - 35));
  const conversionScore = Math.min(100, (conversionPct / 60) * 100);
  const score = Math.round(
    0.3 * coverageScore
    + 0.2 * conversionScore
    + 0.2 * collectionPct
    + 0.15 * fairnessPct
    + 0.15 * Math.min(100, visitAchievementPct),
  );
  const tier = score >= 75 ? 'High' : score >= 55 ? 'Medium' : 'Low';

  return {
    totalDsas, visited, onTarget, neglected, dsaVisits, topDsa, topVisits,
    coveragePct, onTargetPct, visitAchievementPct, topSharePct, conversionPct, collectionPct, fairnessPct,
    flags, score, tier,
  };
}

/** High / Medium / Low tier for a DSA, from its existing quality tag */
export const dsaTier = (d) => (d.quality === 'High' ? 'High' : d.quality === 'Average' ? 'Medium' : 'Low');

/** Count officers / DSAs per tier */
export function tierCounts(items, tierOf) {
  const c = { High: 0, Medium: 0, Low: 0 };
  items.forEach((x) => { c[tierOf(x)]++; });
  return c;
}
