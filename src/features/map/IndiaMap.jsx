import { useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup, Line } from 'react-simple-maps';
import { FiPlus, FiMinus, FiMaximize2 } from 'react-icons/fi';
import topology from '@/data/indiaTopology.json';
import { perfColor, PERF_SCALE, NO_DATA_COLOR } from '@/shared/utils/performanceColor';
import { formatCurrency } from '@/shared/utils/formatCurrency';

const DEFAULT_POS = { coordinates: [82.5, 22.5], zoom: 1 };

/** Sequential colour ramp for disbursement / DSA density views */
function ramp(value, max, rgb) {
  if (!value) return NO_DATA_COLOR;
  const t = 0.18 + 0.82 * Math.min(1, value / max);
  return `rgba(${rgb}, ${t.toFixed(2)})`;
}

/**
 * stateData: { [mapName]: { id, name, targetPct, disbursement, activeDsas, officers, branches } }
 * markers:   [{ id, name, lat, lng, value, color, kind }]
 */
export default function IndiaMap({ stateData, mode, onStateClick, markers = [], selectedId, onMarkerClick, focus, height = 600 }) {
  const [pos, setPos] = useState(focus || DEFAULT_POS);
  const [tip, setTip] = useState(null);
  const focusKey = focus ? `${focus.coordinates.join(',')}|${focus.zoom}` : '';
  useEffect(() => { setPos(focus || DEFAULT_POS); setTip(null); }, [focusKey]); // eslint-disable-line

  const maxDisb = useMemo(() => Math.max(...Object.values(stateData).map((s) => s.disbursement), 1), [stateData]);
  const maxDsa = useMemo(() => Math.max(...Object.values(stateData).map((s) => s.activeDsas), 1), [stateData]);

  const fill = (s) => {
    if (!s) return NO_DATA_COLOR;
    if (mode === 'disbursement') return ramp(s.disbursement, maxDisb, '26, 188, 156');
    if (mode === 'dsa') return ramp(s.activeDsas, maxDsa, '108, 92, 231');
    return perfColor(s.targetPct);
  };

  // Screen-space scale for markers: grow up to 2x while zooming in, then hold a constant on-screen size
  const sc = pos.zoom <= 4 ? 1 / Math.sqrt(pos.zoom) : 2 / pos.zoom;

  const zoomBy = (f) => setPos((p) => ({ ...p, zoom: Math.max(1, Math.min(80, p.zoom * f)) }));

  return (
    <div style={{ position: 'relative', height, background: 'var(--input-bg)', borderRadius: 8, overflow: 'hidden' }}
      onMouseMove={(e) => tip && setTip((t) => (t ? { ...t, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY } : t))}>
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 1050, center: [82.5, 22.5] }} width={820} height={height} style={{ width: '100%', height: '100%' }}>
        <ZoomableGroup center={pos.coordinates} zoom={pos.zoom} onMoveEnd={(p) => setPos(p)} minZoom={1} maxZoom={80}>
          <Geographies geography={topology}>
            {({ geographies }) => geographies.map((geo) => {
              const s = stateData[geo.properties.st_nm];
              const isSel = s && selectedId === s.id;
              return (
                <Geography key={geo.rsmKey} geography={geo}
                  fill={fill(s)} stroke={isSel ? '#1a0f35' : '#fff'} strokeWidth={isSel ? 1.4 / pos.zoom : 0.6 / pos.zoom}
                  style={{
                    default: { outline: 'none', transition: 'fill 200ms' },
                    hover: { outline: 'none', fill: s ? shade(fill(s)) : NO_DATA_COLOR, cursor: s ? 'pointer' : 'default' },
                    pressed: { outline: 'none' },
                  }}
                  onMouseEnter={(e) => s && setTip({ s, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
                  onMouseLeave={() => setTip(null)}
                  onClick={() => s && onStateClick?.(s)}
                />
              );
            })}
          </Geographies>
          {markers.map((m) => (
            <Marker key={m.id} coordinates={[m.lng, m.lat]} onClick={() => onMarkerClick?.(m)}
              onMouseEnter={(e) => setTip({ m, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })} onMouseLeave={() => setTip(null)} style={{ default: { cursor: 'pointer' } }}>
              <circle r={(m.kind === 'dsa' ? 3 : m.kind === 'officer' ? 4.5 : 6) * sc} fill={m.color} stroke="#fff" strokeWidth={1.5 * sc}
                opacity={selectedId && selectedId !== m.id ? 0.45 : 1} />
              {selectedId === m.id && <circle r={11 * sc} fill="none" stroke={m.color} strokeWidth={2 * sc} className="pulse" />}
              {m.label && pos.zoom > 2.5 && <text y={-9 * sc} textAnchor="middle" style={{ fontSize: 10 * sc, fontWeight: 600, fill: 'var(--text-primary)', pointerEvents: 'none', paintOrder: 'stroke', stroke: 'var(--card-bg)', strokeWidth: 3 * sc, strokeLinejoin: 'round' }}>{m.label}</text>}
            </Marker>
          ))}
          {focus?.routes?.map((r, i) => (
            <RouteLine key={i} points={r.points} color={r.color} zoom={pos.zoom} />
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* controls */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <MapBtn onClick={() => zoomBy(1.5)} title="Zoom in"><FiPlus /></MapBtn>
        <MapBtn onClick={() => zoomBy(1 / 1.5)} title="Zoom out"><FiMinus /></MapBtn>
        <MapBtn onClick={() => setPos(focus || DEFAULT_POS)} title="Reset view"><FiMaximize2 /></MapBtn>
      </div>

      {/* legend */}
      <div className="card" style={{ position: 'absolute', bottom: 12, right: 12, padding: '10px 12px', fontSize: 12 }}>
        <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>{mode === 'performance' ? 'Target achievement' : mode === 'disbursement' ? 'Disbursement' : 'Active DSAs'}</div>
        {mode === 'performance' ? PERF_SCALE.map((s) => (
          <div key={s.label} className="flex items-center gap-2" style={{ padding: '2px 0' }}><span style={{ width: 14, height: 10, borderRadius: 2, background: s.color }} />{s.label}</div>
        )) : (
          <div className="flex items-center gap-2"><span>Low</span><span style={{ width: 90, height: 10, borderRadius: 3, background: `linear-gradient(90deg, rgba(${mode === 'disbursement' ? '26,188,156' : '108,92,231'},0.18), rgba(${mode === 'disbursement' ? '26,188,156' : '108,92,231'},1))` }} /><span>High</span></div>
        )}
        <div className="flex items-center gap-2" style={{ padding: '2px 0' }}><span style={{ width: 14, height: 10, borderRadius: 2, background: NO_DATA_COLOR }} />No data / out of scope</div>
      </div>

      {/* tooltip */}
      {tip && (tip.s || tip.m) && (
        <div className="chart-tooltip" style={{ position: 'absolute', left: Math.min(tip.x + 14, 560), top: tip.y + 14, pointerEvents: 'none', zIndex: 5 }}>
          {tip.s ? (
            <>
              <div className="tt-title">{tip.s.name}</div>
              <div className="tt-row"><span>Disbursement</span><b>{formatCurrency(tip.s.disbursement)}</b></div>
              <div className="tt-row"><span>Target</span><b style={{ color: perfColor(tip.s.targetPct) === '#86EFAC' ? '#16A34A' : perfColor(tip.s.targetPct) }}>{tip.s.targetPct}%</b></div>
              <div className="tt-row"><span>Officers</span><b>{tip.s.officers}</b></div>
              <div className="tt-row"><span>Active DSAs</span><b>{tip.s.activeDsas}</b></div>
              <div className="tt-row"><span>Branches</span><b>{tip.s.branches}</b></div>
            </>
          ) : (
            <>
              <div className="tt-title">{tip.m.name}</div>
              {tip.m.rows?.map((r) => <div className="tt-row" key={r[0]}><span>{r[0]}</span><b>{r[1]}</b></div>)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RouteLine({ points, color, zoom }) {
  return points.slice(1).map((p, i) => (
    <Line key={i} from={points[i]} to={p} stroke={color} strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom} ${4 / zoom}`} strokeLinecap="round" opacity={0.85} />
  ));
}

function MapBtn({ children, ...rest }) {
  return (
    <button {...rest} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--card-shadow)' }}>
      {children}
    </button>
  );
}

function shade(color) {
  if (color.startsWith('rgba')) return color.replace(/[\d.]+\)$/, '1)');
  const n = parseInt(color.slice(1), 16);
  const f = (v) => Math.max(0, Math.round(v * 0.85));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
