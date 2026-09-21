import {
  ResponsiveContainer, LineChart as RLineChart, Line, AreaChart as RAreaChart, Area, BarChart as RBarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LabelList, ReferenceDot, Legend, ComposedChart,
} from 'recharts';
import { Fragment } from 'react';
import { formatAxis, formatCurrency, formatIndian } from '@/shared/utils/formatCurrency';
import { COLORS } from '@/shared/utils/colors';

const AXIS = { fontSize: 11.5, fill: 'var(--text-muted)' };
const GRID = { stroke: 'var(--border)', strokeDasharray: '3 3', vertical: false };

/* ---------- Tooltip ---------- */
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tt-title">{label}</div>
      {payload.map((p) => (
        <div className="tt-row" key={p.dataKey || p.name}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="dot" style={{ background: p.color || p.fill }} />{p.name}</span>
          <b>{formatter ? formatter(p.value, p.dataKey) : formatIndian(p.value)}</b>
        </div>
      ))}
    </div>
  );
}
export const currencyFmt = (v) => formatCurrency(v);
export const pctFmt = (v) => `${v}%`;

/* ---------- Legend ---------- */
export function ChartLegend({ items }) {
  return (
    <div className="chart-legend">
      {items.map((i) => (
        <span key={i.label}>
          <span className="dot" style={{ background: i.color, width: 10, height: 10, ...(i.dashed ? { background: 'transparent', border: `2px dashed ${i.color}` } : {}) }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* ---------- Line chart ---------- */
export function LineChart({ data, xKey = 'label', series, height = 240, formatter, yFormatter = formatIndian, curved = true }) {
  return (
    <ResponsiveContainer width="100%" height={height} debounce={60}>
      <RLineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={yFormatter} width={52} />
        <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ stroke: 'var(--border-strong)' }} />
        {series.map((s) => (
          <Line key={s.key} type={curved ? 'monotone' : 'linear'} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2}
            strokeDasharray={s.dashed ? '5 4' : undefined} dot={{ r: 3, fill: s.color, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        ))}
      </RLineChart>
    </ResponsiveContainer>
  );
}

/* ---------- Area chart ---------- */
export function AreaChart({ data, xKey = 'label', yKey, color = COLORS.teal, height = 240, formatter = currencyFmt, yFormatter = formatAxis, labelPeak = true, name = 'Value' }) {
  const peak = data.reduce((m, d) => (d[yKey] > (m?.[yKey] ?? -Infinity) ? d : m), null);
  const id = `grad-${yKey}-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={height} debounce={60}>
      <RAreaChart data={data} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={yFormatter} width={52} />
        <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ stroke: 'var(--border-strong)' }} />
        <Area type="monotone" dataKey={yKey} name={name} stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        {labelPeak && peak && (
          <ReferenceDot x={peak[xKey]} y={peak[yKey]} r={5} fill={color} stroke="#fff" strokeWidth={2}
            label={{ value: formatter(peak[yKey]), position: 'top', fontSize: 11, fontWeight: 600, fill: 'var(--text-primary)' }} />
        )}
      </RAreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- Vertical bar chart ---------- */
export function BarChart({ data, xKey = 'label', series, height = 240, formatter = currencyFmt, yFormatter = formatAxis, colorBy, stacked, layout = 'vertical', showLabels }) {
  const horizontal = layout === 'horizontal';
  return (
    <ResponsiveContainer width="100%" height={height} debounce={60}>
      <RBarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 10, right: showLabels ? 56 : 12, left: 0, bottom: 0 }} barCategoryGap={horizontal ? 8 : '28%'}>
        <CartesianGrid {...GRID} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={yFormatter} />
            <YAxis type="category" dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={yFormatter} width={52} />
          </>
        )}
        <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ fill: 'var(--row-hover)' }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={stacked ? 'a' : undefined}
            radius={horizontal ? [0, 4, 4, 0] : [5, 5, 0, 0]} maxBarSize={horizontal ? 22 : 48} isAnimationActive={false}>
            {colorBy && data.map((d, i) => <Cell key={i} fill={colorBy(d)} />)}
            {showLabels && <LabelList dataKey={s.labelKey || s.key} position={horizontal ? 'right' : 'top'} formatter={s.labelFormatter || formatter} style={{ fontSize: 11, fontWeight: 600, fill: 'var(--text-secondary)' }} />}
          </Bar>
        ))}
      </RBarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Dual-axis composed chart ---------- */
export function DualAxisChart({ data, xKey = 'label', bar, line, height = 260, formatter = currencyFmt }) {
  return (
    <ResponsiveContainer width="100%" height={height} debounce={60}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={formatAxis} width={52} />
        <YAxis yAxisId="right" orientation="right" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={line.axisFormatter || formatAxis} width={52} />
        <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ fill: 'var(--row-hover)' }} />
        <Bar yAxisId="left" dataKey={bar.key} name={bar.label} fill={bar.color} radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        <Line yAxisId="right" type="monotone" dataKey={line.key} name={line.label} stroke={line.color} strokeWidth={2} dot={{ r: 3, fill: line.color, strokeWidth: 0 }} isAnimationActive={false} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------- Donut ---------- */
export function DonutChart({ data, height = 220, centerLabel, centerValue, formatter }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height} debounce={60}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={formatter || ((v) => `${formatIndian(v)} (${total ? Math.round((v / total) * 100) : 0}%)`)} />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 26, fontWeight: 700 }} className="num">{centerValue ?? formatIndian(total)}</div>
        <div className="label" style={{ fontSize: 10.5 }}>{centerLabel}</div>
      </div>
    </div>
  );
}

/* ---------- Funnel (horizontal bars with labels left, numbers right) ---------- */
export function FunnelChart({ stages }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="flex-col" style={{ gap: 12 }}>
      {stages.map((s, i) => (
        <div key={s.label}>
          <div className="flex justify-between" style={{ fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</span>
            <span className="num" style={{ fontWeight: 700, fontSize: 12 }}>{formatIndian(s.value)}</span>
          </div>
          <div style={{ height: 7, background: 'var(--input-bg)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(s.value / max) * 100}%`, height: '100%', background: s.color, borderRadius: 4, transition: 'width 600ms ease', animation: `fadeUp 400ms ${i * 80}ms both` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Sparkline ---------- */
export function Sparkline({ data, width = 90, height = 26, color }) {
  if (!data?.length) return null;
  const up = data[data.length - 1] >= data[0];
  const stroke = color || (up ? COLORS.success : COLORS.danger);
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 2 - ((v - min) / rng) * (height - 4)}`).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={height - 2 - ((data[data.length - 1] - min) / rng) * (height - 4)} r="2.4" fill={stroke} />
    </svg>
  );
}

/* ---------- Progress bar ---------- */
export function ProgressBar({ value, max = 100, color, height = 8, label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      {label && <div className="flex justify-between" style={{ fontSize: 11, marginBottom: 4, color: 'var(--text-secondary)' }}><span>{label}</span><span className="num">{Math.round(pct)}%</span></div>}
      <div className="progress" style={{ height }}><span style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

/* ---------- Heat map (rows × cols grid) ---------- */
export function HeatMap({ rows, cols, values, color = '108, 92, 231', cellSize = 26 }) {
  const max = Math.max(...values.flat(), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${cols.length}, ${cellSize}px)`, gap: 3, alignItems: 'center' }}>
        <div />
        {cols.map((c) => <div key={c} style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{c}</div>)}
        {rows.map((r, ri) => (
          <Fragment key={r}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{r}</div>
            {cols.map((c, ci) => {
              const v = values[ri][ci];
              return (
                <div key={`${ri}-${ci}`} title={`${r} ${c}: ${v} visits`}
                  style={{ width: cellSize, height: cellSize, borderRadius: 4, background: `rgba(${color}, ${0.08 + (v / max) * 0.85})` }} />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
