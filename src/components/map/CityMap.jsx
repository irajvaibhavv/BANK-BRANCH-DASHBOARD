import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../context/ThemeContext';

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Re-centre the map when the branch (centre) changes */
function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center[0], center[1], zoom]); // eslint-disable-line
  return null;
}

/**
 * Street-level branch view on real OSM/CARTO tiles.
 * markers: [{ id, name, lat, lng, kind: 'branch'|'officer'|'dsa', color, label, rows }]
 * routes:  [{ color, points: [[lng, lat], ...] }]
 * heat:    [{ id, name, lat, lng, intensity 0–1, radius (m), color, dead, rows }] — glowing blobs drawn under the markers
 */
export default function CityMap({ center, zoom = 13, markers = [], routes = [], heat = [], selectedId, onMarkerClick, height = 600 }) {
  const { isDark } = useTheme();
  const radius = (k) => (k === 'customer' ? 4.5 : k === 'dsa' ? 6 : k === 'officer' ? 9 : 12);

  return (
    <div style={{ position: 'relative', height, borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer key={isDark ? 'dark' : 'light'} url={isDark ? DARK_TILES : LIGHT_TILES} attribution={ATTRIB} subdomains="abcd" maxZoom={19} />
        <Recenter center={center} zoom={zoom} />
        {heat.map((h) => (
          // three concentric circles with falling opacity ≈ a radial heat glow
          [1, 0.7, 0.4].map((k, i) => (
            <Circle key={`${h.id}-${i}`} center={[h.lat, h.lng]} radius={h.radius * k}
              pathOptions={{ stroke: i === 0 && h.dead, color: h.color, dashArray: '6 6', weight: 2, fillColor: h.color, fillOpacity: h.dead ? 0.08 : 0.1 + h.intensity * 0.18 }}
              eventHandlers={{ click: () => onMarkerClick?.(h) }}>
              {i === 0 && (
                <Tooltip direction="top" sticky opacity={1}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{h.name}</div>
                  {h.rows?.map((r) => <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontSize: 11.5 }}><span style={{ opacity: 0.7 }}>{r[0]}</span><b>{r[1]}</b></div>)}
                </Tooltip>
              )}
            </Circle>
          ))
        ))}
        {routes.map((r, i) => (
          <Polyline key={i} positions={r.points.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: r.color, weight: 2.5, dashArray: '6 5', opacity: 0.85 }} />
        ))}
        {markers.map((m) => {
          const dim = selectedId && selectedId !== m.id;
          return (
            <CircleMarker key={m.id} center={[m.lat, m.lng]} radius={radius(m.kind) * (selectedId === m.id ? 1.3 : 1)}
              pathOptions={{ color: '#fff', weight: 2, fillColor: m.color, fillOpacity: dim ? 0.4 : 0.95, opacity: dim ? 0.5 : 1 }}
              eventHandlers={{ click: () => onMarkerClick?.(m) }}>
              <Tooltip direction="top" offset={[0, -radius(m.kind)]} opacity={1} permanent={m.kind === 'branch'}>
                <div style={{ fontWeight: 600, marginBottom: m.rows ? 4 : 0 }}>{m.name}</div>
                {m.rows?.map((r) => <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontSize: 11.5 }}><span style={{ opacity: 0.7 }}>{r[0]}</span><b>{r[1]}</b></div>)}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
