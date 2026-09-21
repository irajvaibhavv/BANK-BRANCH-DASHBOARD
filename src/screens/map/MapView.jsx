import { useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import Breadcrumb from '../../components/layout/Breadcrumb';
import IndiaMap from '../../components/map/IndiaMap';
import CityMap from '../../components/map/CityMap';
import { Card, PillToggle, SearchBar, IconButton, Avatar, Badge } from '../../components/common';
import { useScope } from '../../hooks/useScope';
import { useDateRange, DATE_RANGES } from '../../context/DateRangeContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { perfColor } from '../../utils/performanceColor';
import { DATA, aggregateBranches, ranked, stateById } from '../../utils/scopeHelpers';
import { COLORS } from '../../utils/colors';
import { LOCALITIES, hash, dsaArea } from '../../utils/areas';
import { officerProductivity } from '../../utils/officerProductivity';

const MODES = [{ id: 'performance', label: 'Performance' }, { id: 'disbursement', label: 'Disbursement' }, { id: 'dsa', label: 'DSA Density' }];
const CITY_MODES = [{ id: 'heat', label: 'BO heat map' }, { id: 'markers', label: 'Officers & routes' }];
const CUSTOMER_COLOR = '#0D9488';

// classic heat ramp: cold (blue) → warm (yellow) → hot (red)
const heatColor = (t) => (t >= 0.75 ? '#DC2626' : t >= 0.5 ? '#F97316' : t >= 0.25 ? '#FACC15' : '#60A5FA');
const DEAD_COLOR = '#64748B';
const NOW = new Date('2026-09-18T11:30:00+05:30');
const RANGES = DATE_RANGES.filter((r) => ['month', 'lastMonth', 'quarter'].includes(r.id));

// deterministic small offsets so officer/DSA markers spread around a branch
const jitter = (i, r = 0.06) => [Math.cos(i * 2.4) * r * (1 + (i % 3) * 0.4), Math.sin(i * 2.4) * r * (1 + (i % 2) * 0.5)];

/**
 * Customers an officer met this month, placed deterministically around the localities.
 * Repeat visits are skewed onto the first few customers — a "concentrated" officer keeps
 * going back to the same people, a balanced one spreads them out.
 */
function officerCustomers(o) {
  const unique = Math.max(1, o.uniqueCustomers || 0);
  const total = Math.max(unique, o.customerVisits || unique);
  let extra = total - unique;
  return Array.from({ length: unique }, (_, k) => {
    const h = hash(`${o.id}-c${k}`);
    const [name, dx, dy] = LOCALITIES[h % LOCALITIES.length];
    const [jx, jy] = jitter(h % 97, 0.007);
    // hand out the repeat visits: the first customers take the most
    const take = extra > 0 ? Math.min(extra, Math.max(1, Math.ceil(extra / (k + 2)))) : 0;
    extra -= take;
    return { id: `${o.id}-C${k + 1}`, name: `Customer ${k + 1}`, area: name, dx: dx + jx, dy: dy + jy, visits: 1 + take };
  });
}

export default function MapView() {
  const { level, currentScope, states, branches, officers, dsas, drillDown, scopeLabel } = useScope();
  const { rangeId, setRangeId, scale } = useDateRange();
  const toast = useToast();
  const [mode, setMode] = useState('performance');
  const [cityMode, setCityMode] = useState('heat');
  const [officerId, setOfficerId] = useState(null); // BO whose movement the heat map shows (null = whole branch)
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');

  // ----- state-level fills (only states in scope get colour) -----
  const stateData = useMemo(() => {
    const out = {};
    states.forEach((s) => {
      const bl = DATA.branches.filter((b) => b.stateId === s.id);
      if (!bl.length) return;
      const a = aggregateBranches(bl);
      out[s.mapName] = { id: s.id, name: s.name, level: 'state', targetPct: a.targetPct, disbursement: scale(a.monthlyDisbursement), activeDsas: a.activeDsas, officers: a.officerCount, branches: bl.length };
    });
    return out;
  }, [states, scale]);

  // ----- markers & focus per level -----
  const { markers, focus, listRows } = useMemo(() => {
    if (level === 'national' || level === 'regional') {
      const rows = ranked(Object.values(stateData), 'disbursement').map((s) => ({ ...s, metric: formatCurrency(s.disbursement), color: perfColor(s.targetPct), sub: `${s.branches} branches · ${s.targetPct}%` }));
      const f = level === 'regional' ? regionFocus(currentScope.regionId) : null;
      return { markers: [], focus: f, listRows: rows };
    }
    if (level === 'state') {
      const st = stateById(currentScope.stateId);
      const ms = branches.map((b) => ({ id: b.id, level: 'branch', name: b.name, lat: b.lat, lng: b.lng, kind: 'branch', label: b.name, color: perfColor(b.targetPct), targetPct: b.targetPct, value: scale(b.monthlyDisbursement),
        rows: [['Disbursement', formatCurrency(scale(b.monthlyDisbursement))], ['Target', `${b.targetPct}%`], ['Officers', b.officerCount], ['Active DSAs', b.activeDsas]] }));
      const c = centroid(branches);
      return { markers: ms, focus: { coordinates: c, zoom: st.id === 'DL' ? 9 : 4 }, listRows: ranked(ms, 'value').map((m) => ({ ...m, metric: formatCurrency(m.value), sub: `${m.targetPct}% of target` })) };
    }
    // branch level: city view with officers, DSAs, today's routes
    const b = branches[0];
    // ---- DSA movement heat: group DSAs by locality, score by visits + recency ----
    const visitsByDsa = {};
    officers.forEach((o) => (o.dsaVisits || []).forEach((v) => { visitsByDsa[v.dsaId] = (visitsByDsa[v.dsaId] || 0) + v.visits; }));
    const dsaMoving = (d) => (visitsByDsa[d.id] || 0) > 0 && (NOW - new Date(d.lastActive)) / 86400000 <= 14;
    const areaStats = LOCALITIES.map(([name, dx, dy]) => {
      const list = dsas.filter((d) => dsaArea(d)[0] === name);
      const visits = list.reduce((a, d) => a + (visitsByDsa[d.id] || 0), 0);
      const moving = list.filter(dsaMoving).length;
      const files = list.reduce((a, d) => a + d.files, 0);
      return { id: `area-${name}`, name, lat: b.lat + dy, lng: b.lng + dx, dsaCount: list.length, visits, moving, idle: list.length - moving, files };
    }).filter((a) => a.dsaCount > 0);
    const maxVisits = Math.max(1, ...areaStats.map((a) => a.visits));
    const heat = areaStats.map((a) => {
      const intensity = a.visits / maxVisits;
      const dead = a.moving === 0 || a.moving / a.dsaCount < 0.4;
      return { ...a, intensity, dead, kind: 'area', radius: 420 + a.dsaCount * 60, color: dead ? DEAD_COLOR : heatColor(intensity),
        rows: [['DSAs', a.dsaCount], ['Visits this month', a.visits], ['DSAs moving', `${a.moving} / ${a.dsaCount}`], ['Files', a.files], ['Status', dead ? 'No movement' : intensity >= 0.75 ? 'Hot' : intensity >= 0.5 ? 'Warm' : 'Low']] };
    });
    if (cityMode === 'heat' && officerId) {
      // ---- one BO: every DSA and customer they went to this month ----
      const o = officers.find((x) => x.id === officerId);
      const mine = dsas.filter((d) => d.officerId === officerId);
      const visitOf = Object.fromEntries((o.dsaVisits || []).map((v) => [v.dsaId, v]));
      const customers = officerCustomers(o);
      const dsaMk = mine.map((d, i) => { const [name, dx, dy] = dsaArea(d); const [jx, jy] = jitter(i + 3, 0.006); const v = visitOf[d.id] || { visits: 0, target: 4, filesCollected: 0 };
        const color = v.visits === 0 ? DEAD_COLOR : v.visits >= v.target ? '#DC2626' : '#F97316';
        return { id: d.id, name: d.firm, area: name, lat: b.lat + dy + jy, lng: b.lng + dx + jx, kind: 'dsa', color, visits: v.visits,
          rows: [['Area', name], ['Visits by ' + o.name.split(' ')[0], `${v.visits} / ${v.target}`], ['Files collected', v.filesCollected], ['Quality', d.quality], ['Status', v.visits === 0 ? 'Not visited' : v.visits >= v.target ? 'On target' : 'Under target']] }; });
      const custMk = customers.map((c) => ({ id: c.id, name: c.name, area: c.area, lat: b.lat + c.dy, lng: b.lng + c.dx, kind: 'customer', color: CUSTOMER_COLOR, visits: c.visits,
        rows: [['Area', c.area], ['Visits this month', c.visits], ['Pattern', c.visits >= 3 ? 'Repeat — same customer again' : c.visits === 2 ? 'Follow-up' : 'Single visit']] }));
      const areas = LOCALITIES.map(([name, dx, dy]) => {
        const dl = dsaMk.filter((m) => m.area === name), cl = custMk.filter((m) => m.area === name);
        const dsaVisits = dl.reduce((a, m) => a + m.visits, 0), custVisits = cl.reduce((a, m) => a + m.visits, 0);
        return { id: `area-${name}`, name, lat: b.lat + dy, lng: b.lng + dx, dsaCount: dl.length, covered: dl.filter((m) => m.visits > 0).length, customers: cl.length, dsaVisits, custVisits, visits: dsaVisits + custVisits };
      }).filter((a) => a.dsaCount > 0 || a.customers > 0);
      const mx = Math.max(1, ...areas.map((a) => a.visits));
      const oHeat = areas.map((a) => { const intensity = a.visits / mx; const dead = a.visits === 0;
        return { ...a, intensity, dead, idle: a.dsaCount - a.covered, kind: 'area', radius: 380 + (a.dsaCount + a.customers) * 45, color: dead ? DEAD_COLOR : heatColor(intensity),
          rows: [['DSA visits', `${a.dsaVisits} (${a.covered}/${a.dsaCount} DSAs)`], ['Customer visits', `${a.custVisits} (${a.customers} customers)`], ['Status', dead ? 'Never went here' : intensity >= 0.75 ? 'Goes most' : intensity >= 0.5 ? 'Regular' : 'Rare']] }; });
      const bm = { id: b.id, name: `${b.name} Branch`, lat: b.lat, lng: b.lng, kind: 'branch', color: COLORS.brand, label: 'Branch', rows: [['Officer', o.name], ['DSAs', mine.length], ['Customers met', customers.length]] };
      const rows = ranked(oHeat, 'visits').map((a) => ({ ...a, metric: `${a.visits} visits`, sub: a.dead ? `⚠ never visited · ${a.dsaCount} DSA${a.dsaCount === 1 ? '' : 's'} here` : `${a.dsaVisits} DSA · ${a.custVisits} customer · ${a.covered}/${a.dsaCount} DSAs covered` }));
      return { markers: [...custMk, ...dsaMk, bm], focus: { coordinates: [b.lng, b.lat], zoom: 40, routes: [], heat: oHeat }, listRows: rows };
    }
    if (cityMode === 'heat') {
      const heatDsas = dsas.map((d, i) => { const [name, dx, dy] = dsaArea(d); const [jx, jy] = jitter(i + 3, 0.006); const moving = dsaMoving(d);
        return { id: d.id, name: d.firm, lat: b.lat + dy + jy, lng: b.lng + dx + jx, kind: 'dsa', color: moving ? '#B91C1C' : DEAD_COLOR, rows: [['Area', name], ['Visits this month', visitsByDsa[d.id] || 0], ['Last active', d.lastActive.slice(0, 10)], ['Officer', d.officerName], ['Status', moving ? 'Moving' : 'Not moving']] }; });
      const bm = { id: b.id, name: `${b.name} Branch`, lat: b.lat, lng: b.lng, kind: 'branch', color: COLORS.brand, label: 'Branch', rows: [['Officers', b.officerCount], ['DSAs', dsas.length]] };
      const rows = ranked(heat, 'visits').map((a) => ({ ...a, metric: `${a.visits} visits`, sub: a.dead ? `⚠ ${a.idle} of ${a.dsaCount} DSAs not moving` : `${a.moving}/${a.dsaCount} DSAs moving · ${a.files} files` }));
      return { markers: [...heatDsas, bm], focus: { coordinates: [b.lng, b.lat], zoom: 40, routes: [], heat }, listRows: rows };
    }
    const offMarkers = officers.map((o, i) => { const [dx, dy] = jitter(i + 1, 0.012); return { id: o.id, level: 'officer', name: o.name, lat: b.lat + dy, lng: b.lng + dx, kind: 'officer', label: o.name.split(' ')[0], color: o.status === 'Active' ? COLORS.success : o.status === 'Idle' ? COLORS.warning : COLORS.danger, value: o.visitsToday,
      rows: [['Status', o.status], ['Visits today', o.visitsToday], ['Disbursement', formatCurrency(o.monthlyDisbursement)], ['Target', `${o.targetPct}%`]] }; });
    const dsaMarkers = dsas.map((d, i) => { const [dx, dy] = jitter(i + 7, 0.022); return { id: d.id, name: d.firm, lat: b.lat + dy, lng: b.lng + dx, kind: 'dsa', color: d.quality === 'High' ? COLORS.teal : d.quality === 'Inactive' ? COLORS.muted : COLORS.info, rows: [['Quality', d.quality], ['Files', d.files], ['Approval', `${d.approvalRate}%`]] }; });
    const branchMarker = { id: b.id, name: `${b.name} Branch`, lat: b.lat, lng: b.lng, kind: 'branch', color: COLORS.brand, label: 'Branch', rows: [['Officers', b.officerCount], ['Active DSAs', b.activeDsas]] };
    const routes = offMarkers.filter((o) => o.value > 0).slice(0, 3).map((o, i) => ({ color: o.color, points: [[b.lng, b.lat], ...dsaMarkers.slice(i * 3, i * 3 + 3).map((d) => [d.lng, d.lat]), [o.lng, o.lat]] }));
    return { markers: [...dsaMarkers, ...offMarkers, branchMarker], focus: { coordinates: [b.lng, b.lat], zoom: 40, routes }, listRows: ranked(offMarkers, 'value').map((m) => ({ ...m, metric: `${m.value} visits`, sub: m.rows[0][1] })) };
  }, [level, stateData, branches, officers, dsas, currentScope, scale, cityMode, officerId]);

  const filteredRows = listRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));
  const onStateClick = (s) => { if (level === 'national' || level === 'regional') drillDown('state', s.id); };
  const onMarkerClick = (m) => { if (m.level === 'branch') drillDown('branch', m.id); else setSelected(m.id); };
  const isHeat = level === 'branch' && cityMode === 'heat';
  const deadAreas = isHeat ? listRows.filter((r) => r.dead) : [];
  const heatOfficer = isHeat && officerId ? officers.find((o) => o.id === officerId) : null;
  const heatProd = heatOfficer ? officerProductivity(heatOfficer) : null;
  const boRows = useMemo(() => isHeat ? officers.map((o) => ({ o, p: officerProductivity(o) })).sort((a, b) => b.p.score - a.p.score) : [], [isHeat, officers]);

  return (
    <>
      <Breadcrumb />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px' }}>
        <Card animate={false} title={heatOfficer ? `${heatOfficer.name} — where they go` : level === 'branch' ? `${scopeLabel} — ${CITY_MODES.find((m) => m.id === cityMode).label}` : `${scopeLabel} — ${MODES.find((m) => m.id === mode).label} view`}
          description={heatOfficer ? 'Every DSA (dots) and customer (teal) this officer visited this month. Red = goes most, grey dashed = has DSAs there but never went' : isHeat ? 'Where DSAs are moving this month. Pick an officer on the right to see their own movement. Red = most visits, blue = few, grey dashed = no DSA movement' : level === 'branch' ? 'Officer locations (large dots), DSAs (small dots) and today\'s routes' : level === 'state' ? 'Click a branch marker to open the branch view' : 'Click a state to drill into its branches'}
          actions={<><PillToggle size="sm" options={RANGES} value={rangeId} onChange={setRangeId} />{level === 'branch' ? <PillToggle size="sm" options={CITY_MODES} value={cityMode} onChange={setCityMode} /> : <PillToggle size="sm" options={MODES} value={mode} onChange={setMode} />}<IconButton title="Download" onClick={() => toast('Map exported as PNG (prototype)')}><FiDownload size={15} /></IconButton></>}>
          <div style={{ position: 'relative' }}>
            {level === 'branch'
              ? <CityMap center={[focus.coordinates[1], focus.coordinates[0]]} zoom={isHeat ? 13 : 14} markers={markers} routes={focus.routes} heat={focus.heat} selectedId={selected} onMarkerClick={onMarkerClick} height={620} />
              : <IndiaMap stateData={stateData} mode={mode} onStateClick={onStateClick} markers={markers} selectedId={selected} onMarkerClick={onMarkerClick} focus={focus} height={620} />}
            {isHeat && (
              <div className="card" style={{ position: 'absolute', left: 12, bottom: 12, padding: '10px 12px', zIndex: 1000, fontSize: 11 }}>
                <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>{heatOfficer ? 'BO movement' : 'DSA movement'}</div>
                {(heatOfficer
                  ? [['Goes most', '#DC2626'], ['Regular', '#F97316'], ['Rare', '#FACC15'], ['Very rare', '#60A5FA'], ['Never went', DEAD_COLOR], ['Customer visited', CUSTOMER_COLOR]]
                  : [['Hot — most visits', '#DC2626'], ['Warm', '#F97316'], ['Low', '#FACC15'], ['Very low', '#60A5FA'], ['No movement', DEAD_COLOR]]).map(([l, c]) => (
                  <div key={l} className="flex items-center gap-2" style={{ marginBottom: 3 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: c, opacity: 0.8 }} />{l}</div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card animate={false} title={heatOfficer ? 'Areas this officer covers' : isHeat ? 'Areas by DSA movement' : 'Ranked units'} description={isHeat ? `${listRows.length} localities · ${deadAreas.length} ${heatOfficer ? 'never visited' : 'with no movement'}` : `${listRows.length} on map`} style={{ maxHeight: 720, display: 'flex', flexDirection: 'column' }} bodyStyle={{ overflowY: 'auto', flex: 1 }}>
          {isHeat && (
            <div style={{ marginBottom: 12 }}>
              <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Branch officer</div>
              <div className="flex" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button className={`chip ${!officerId ? 'active' : ''}`} onClick={() => { setOfficerId(null); setSelected(null); }}>All DSAs</button>
                {boRows.map(({ o, p }) => (
                  <button key={o.id} className={`chip ${officerId === o.id ? 'active' : ''}`} title={`Score ${p.score} · ${p.tier}`} onClick={() => { setOfficerId(o.id); setSelected(null); }}>
                    <span className="dot" style={{ background: p.tier === 'High' ? COLORS.success : p.tier === 'Medium' ? COLORS.warning : COLORS.danger, width: 7, height: 7, marginRight: 5 }} />{o.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {heatOfficer && (
            <div style={{ background: 'var(--input-bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                <Avatar name={heatOfficer.name} size={28} />
                <div className="flex-1"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{heatOfficer.name}</div><div className="muted" style={{ fontSize: 11 }}>{heatProd.totalDsas} DSAs · {heatOfficer.uniqueCustomers} customers · {heatOfficer.visitsMonth} visits this month</div></div>
                <Badge variant={heatProd.tier === 'High' ? 'success' : heatProd.tier === 'Medium' ? 'warning' : 'danger'}>{heatProd.score}</Badge>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {[['Coverage', `${heatProd.coveragePct}%`, `${heatProd.visited}/${heatProd.totalDsas} DSAs`], ['Top DSA', `${heatProd.topSharePct}%`, 'of DSA visits'], ['Customer spread', `${heatProd.fairnessPct}%`, `${heatOfficer.uniqueCustomers}/${heatOfficer.customerVisits} unique`]].map(([l, v, sub]) => (
                  <div key={l}><div className="muted" style={{ fontSize: 10 }}>{l}</div><div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{v}</div><div className="muted" style={{ fontSize: 10 }}>{sub}</div></div>
                ))}
              </div>
              {heatProd.flags.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--danger)' }}>⚠ {heatProd.flags.map((f) => f.label).join(' · ')}</div>}
            </div>
          )}
          <SearchBar value={query} onChange={setQuery} placeholder={isHeat ? 'Search areas...' : 'Search units...'} style={{ marginBottom: 12 }} />
          {deadAreas.length > 0 && (
            <div style={{ background: 'var(--danger-tint)', borderRadius: 6, padding: '8px 10px', marginBottom: 12, fontSize: 12 }}>
              {heatOfficer
                ? <><b>Never visited:</b> {deadAreas.map((a) => a.name).join(', ')} — {deadAreas.reduce((n, a) => n + a.idle, 0)} of their DSAs sit there untouched.</>
                : <><b>No DSA movement:</b> {deadAreas.map((a) => a.name).join(', ')} — {deadAreas.reduce((n, a) => n + a.idle, 0)} DSAs need a visit.</>}
            </div>
          )}
          {filteredRows.map((r, i) => (
            <div key={r.id} className="list-row" style={{ cursor: 'pointer', padding: '10px 6px', borderRadius: 6, background: selected === r.id ? 'var(--brand-tint)' : undefined }}
              onClick={() => { setSelected(selected === r.id ? null : r.id); }} onDoubleClick={() => r.level && r.level !== 'officer' && drillDown(r.level, r.id)}>
              <span className={`rank ${i < 3 ? `r${i + 1}` : ''}`}>{i + 1}</span>
              <div className="flex-1">
                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{r.sub}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontSize: 12, fontWeight: 700 }}>{r.metric}</div>
                <span className="dot" style={{ background: r.color, width: 10, height: 10 }} />
              </div>
            </div>
          ))}
          {level !== 'branch' && <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>Click to highlight · double-click to drill down</p>}
        </Card>
      </div>
    </>
  );
}

function centroid(list) {
  if (!list.length) return [82.5, 22.5];
  return [list.reduce((a, b) => a + b.lng, 0) / list.length, list.reduce((a, b) => a + b.lat, 0) / list.length];
}
function regionFocus(regionId) {
  return { north: { coordinates: [79, 25.5], zoom: 1.8 }, south: { coordinates: [78, 13.5], zoom: 2.4 }, west: { coordinates: [74, 20], zoom: 2.4 }, east: { coordinates: [88, 24], zoom: 2.2 } }[regionId] || null;
}
