import { useMemo } from 'react';
import { Card } from '@/shared/ui';
import { BarChart, DonutChart, ChartLegend } from '@/shared/charts';
import { useScope } from '@/scope/useScope';
import { DATASET_BY_ID, pivot, widgetTitle } from '@/features/widgets/datasets';
import { CHART_COLORS } from '@/shared/utils/colors';

const color = (i) => CHART_COLORS[i % CHART_COLORS.length];

/** Renders one user-built pivot widget from the current scope. `bare` skips the Card (used in the builder preview). */
export default function CustomWidget({ widget, bare, actions }) {
  const scope = useScope();
  const ds = DATASET_BY_ID[widget.dataset];
  const records = useMemo(() => (ds ? ds.source(scope) : []), [ds, scope]);
  const pv = useMemo(() => pivot(records, widget), [records, widget]);
  const body = ds ? <WidgetBody widget={widget} pv={pv} /> : <p className="muted">Unknown dataset</p>;
  if (bare) return body;
  return (
    <Card animate={false} title={widget.title || widgetTitle(widget)} description={`${ds?.label || ''} · ${records.length} records in scope`} actions={actions}>
      {body}
    </Card>
  );
}

function WidgetBody({ widget, pv }) {
  const { rowKeys, colKeys, cells, totals, grand, measures } = pv;
  const m0 = measures[0];
  if (!m0) return <p className="muted">Pick at least one value to show.</p>;
  const hasCols = colKeys.length > 1 || colKeys[0] !== '*';

  if (widget.view === 'kpi') {
    return (
      <div className="flex" style={{ gap: 28, flexWrap: 'wrap', padding: '6px 0' }}>
        {measures.map((m, i) => (
          <div key={m.id}>
            <div className="label" style={{ marginBottom: 4 }}>{m.label}</div>
            <div className="num" style={{ fontSize: 30, fontWeight: 700, color: color(i) }}>{m.fmt(grand[m.id])}</div>
          </div>
        ))}
      </div>
    );
  }
  if (!rowKeys.length) return <p className="muted">No data in the current scope.</p>;

  if (widget.view === 'donut') {
    // donut = first measure split by rows (or by columns when there is only one row)
    const split = rowKeys.length > 1 || !hasCols ? rowKeys.map((rk, i) => ({ name: rk, value: totals[rk][m0.id], color: color(i) })) : colKeys.map((ck, i) => ({ name: ck, value: cells[rowKeys[0]][ck][m0.id], color: color(i) }));
    const data = split.filter((d) => d.value > 0).slice(0, 8);
    return (
      <>
        <DonutChart data={data} height={210} centerLabel={m0.label} centerValue={m0.fmt(grand[m0.id])} formatter={(v) => m0.fmt(v)} />
        <ChartLegend items={data.map((d) => ({ label: `${d.name} · ${m0.fmt(d.value)}`, color: d.color }))} />
      </>
    );
  }

  if (widget.view === 'bar' || widget.view === 'stacked') {
    // series = columns (one measure) when a column dim is set, else one series per measure
    const series = hasCols
      ? colKeys.map((ck, i) => ({ key: ck, label: ck, color: color(i) }))
      : measures.map((m, i) => ({ key: m.id, label: m.label, color: color(i) }));
    const data = rowKeys.slice(0, 14).map((rk) => {
      const row = { label: rk };
      if (hasCols) colKeys.forEach((ck) => { row[ck] = cells[rk][ck][m0.id]; });
      else measures.forEach((m) => { row[m.id] = totals[rk][m.id]; });
      return row;
    });
    const fmt = hasCols ? m0.fmt : (v, k) => (measures.find((m) => m.id === k) || m0).fmt(v);
    return (
      <>
        <BarChart data={data} series={series} stacked={widget.view === 'stacked'} height={240} formatter={fmt} yFormatter={(v) => m0.fmt(v)} />
        <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      </>
    );
  }

  // table: rows × (columns × measures) with row totals and a grand total
  const colHead = hasCols ? colKeys : [];
  return (
    <div className="table-wrap">
      <table className="table compact">
        <thead>
          <tr>
            <th>{(pv.rowDims || []).map((d) => d.label).join(' / ')}</th>
            {colHead.map((ck) => measures.map((m) => <th key={ck + m.id} style={{ textAlign: 'right' }}>{ck}{measures.length > 1 ? ` · ${m.label}` : ''}</th>))}
            {measures.map((m) => <th key={'t' + m.id} style={{ textAlign: 'right' }}>{hasCols ? `Total ${m.label}` : m.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rowKeys.slice(0, 40).map((rk) => (
            <tr key={rk}>
              <td style={{ fontWeight: 600 }}>{rk}</td>
              {colHead.map((ck) => measures.map((m) => <td key={ck + m.id} className="num" style={{ textAlign: 'right' }}>{cells[rk][ck][m.id] ? m.fmt(cells[rk][ck][m.id]) : <span className="muted">—</span>}</td>))}
              {measures.map((m) => <td key={'t' + m.id} className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{m.fmt(totals[rk][m.id])}</td>)}
            </tr>
          ))}
          <tr style={{ background: 'var(--input-bg)' }}>
            <td style={{ fontWeight: 700 }}>Total</td>
            {colHead.map((ck) => measures.map((m) => <td key={ck + m.id} className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{m.agg === 'avg' ? '' : m.fmt(rowKeys.reduce((a, rk) => a + cells[rk][ck][m.id], 0))}</td>))}
            {measures.map((m) => <td key={'t' + m.id} className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{m.fmt(grand[m.id])}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
