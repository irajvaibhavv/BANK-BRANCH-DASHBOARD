import { useMemo, useRef, useState } from 'react';
import { FiX, FiCheck, FiFilter, FiColumns, FiList, FiHash, FiChevronDown } from 'react-icons/fi';
import { Modal, PillToggle } from '@/shared/ui';
import CustomWidget from '@/features/widgets/CustomWidget';
import { useScope } from '@/scope/useScope';
import { DATASETS, DATASET_BY_ID, WIDGET_VIEWS, widgetTitle, newWidgetId, dimValues } from '@/features/widgets/datasets';

const EMPTY = { dataset: 'loanFiles', rowDims: ['officerName'], colDim: 'stage', measures: ['count'], filters: {}, view: 'table', width: 'half', title: '' };
const WIDTHS = [{ id: 'half', label: 'Half width' }, { id: 'full', label: 'Full width' }];
const MAX_ROWS = 2, MAX_VALUES = 3;

/** Older widgets stored a single rowDim */
const normalise = (w) => ({ ...EMPTY, ...w, rowDims: w.rowDims || (w.rowDim ? [w.rowDim] : []), filters: w.filters || {} });

/**
 * Excel PivotTable-style builder.
 *   left  : field list (dimensions + values) — drag a field into a zone, or click it
 *   zones : Filters | Columns / Rows | Values  (the 2×2 pane Excel users know)
 *   right : live preview from the current scope
 */
export default function WidgetBuilder({ open, initial, onSave, onClose }) {
  const scope = useScope();
  const [w, setW] = useState(() => normalise(initial || { id: newWidgetId() }));
  const dragRef = useRef(null); // { kind: 'dim'|'measure', id } — a ref, not state: re-rendering the dragged node mid-drag cancels the drag in Chrome
  const [over, setOver] = useState(null);
  const [openFilter, setOpenFilter] = useState(null);
  const ds = DATASET_BY_ID[w.dataset];
  const records = useMemo(() => (ds ? ds.source(scope) : []), [ds, scope]);
  const set = (k, v) => setW((x) => ({ ...x, [k]: v }));

  const setDataset = (id) => setW((x) => ({ ...x, dataset: id, rowDims: [], colDim: '', measures: [], filters: {} }));
  const inRows = (id) => w.rowDims.includes(id), inCols = (id) => w.colDim === id, inFilters = (id) => id in w.filters;
  const used = (id) => inRows(id) || inCols(id) || inFilters(id);

  // ---- moving fields between zones ----
  const removeDim = (x, id) => ({ ...x, rowDims: x.rowDims.filter((d) => d !== id), colDim: x.colDim === id ? '' : x.colDim, filters: Object.fromEntries(Object.entries(x.filters).filter(([k]) => k !== id)) });
  const place = (zone, field) => setW((x) => {
    if (field.kind === 'measure') {
      if (zone !== 'values') return x;
      return x.measures.includes(field.id) ? x : { ...x, measures: [...x.measures, field.id].slice(-MAX_VALUES) };
    }
    let n = removeDim(x, field.id);
    if (zone === 'rows') n = { ...n, rowDims: [...n.rowDims, field.id].slice(-MAX_ROWS) };
    else if (zone === 'cols') n = { ...n, colDim: field.id };
    else if (zone === 'filters') n = { ...n, filters: { ...n.filters, [field.id]: [] } };
    else return x;
    return n;
  });
  const clear = (zone, id) => setW((x) => (zone === 'values' ? { ...x, measures: x.measures.filter((m) => m !== id) } : removeDim(x, id)));
  const clickField = (field) => place(field.kind === 'measure' ? 'values' : w.rowDims.length < MAX_ROWS ? 'rows' : !w.colDim ? 'cols' : 'filters', field);

  // ---- native drag & drop ----
  const onDragStart = (field) => (e) => {
    dragRef.current = field;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${field.kind}:${field.id}`); // Firefox needs data set or it will not start a drag
  };
  const onDragEnd = () => { dragRef.current = null; setOver(null); };
  const accepts = (zone, f) => f && (f.kind === 'measure') === (zone === 'values');
  const zoneProps = (zone) => ({
    onDragEnter: (e) => { if (accepts(zone, dragRef.current)) { e.preventDefault(); setOver(zone); } },
    onDragOver: (e) => { if (accepts(zone, dragRef.current)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== zone) setOver(zone); } },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); },
    onDrop: (e) => {
      e.preventDefault();
      let f = dragRef.current;
      if (!f) { const [kind, id] = (e.dataTransfer.getData('text/plain') || '').split(':'); if (kind && id) f = { kind, id }; }
      if (accepts(zone, f)) place(zone, f);
      onDragEnd();
    },
  });

  const dimLabel = (id) => ds.dims.find((d) => d.id === id)?.label || id;
  const measure = (id) => ds.measures.find((m) => m.id === id);
  const canSave = ds && w.measures.length > 0 && (w.view === 'kpi' || w.rowDims.length > 0);
  const toggleFilterValue = (dim, v) => setW((x) => { const cur = x.filters[dim] || []; return { ...x, filters: { ...x.filters, [dim]: cur.includes(v) ? cur.filter((y) => y !== v) : [...cur, v] } }; });

  // plain render helper (not a component) so chips keep no state of their own
  const chip = (zone, id, label, kind) => (
    <span key={id} className={`pv-chip ${kind}`} draggable onDragStart={onDragStart({ kind, id, from: zone })} onDragEnd={onDragEnd}>
      {kind === 'measure' ? <span className="pv-sigma">Σ</span> : null}{label}
      {zone === 'filters' && (
        <button className="pv-chip-x" title="Choose values" onClick={() => setOpenFilter(openFilter === id ? null : id)}><FiChevronDown size={11} /></button>
      )}
      <button className="pv-chip-x" title="Remove" onClick={() => clear(zone, id)}><FiX size={11} /></button>
    </span>
  );

  return (
    <Modal open={open} onClose={onClose} width={1180}>
      {/* ---- header: dataset tabs ---- */}
      <div className="pv-head">
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16 }}>{initial ? 'Edit view' : 'New view'}</div>
          <div className="muted" style={{ fontSize: 12 }}>Drag fields into Rows, Columns, Values and Filters — exactly like a PivotTable.</div>
        </div>
        <div className="pv-tabs">
          {DATASETS.map((d) => <button key={d.id} type="button" className={`pv-tab ${w.dataset === d.id ? 'on' : ''}`} onClick={() => setDataset(d.id)} title={d.description}>{d.icon} {d.label}</button>)}
        </div>
        <button className="setup-close" onClick={onClose}><FiX size={16} /></button>
      </div>

      <div className="pv-body">
        {/* ---- left: field list + zones ---- */}
        <div className="pv-pane">
          <div className="pv-fields">
            <div className="pv-zone-title">PivotTable fields · {ds.label}</div>
            <div className="pv-field-group">Dimensions <span className="muted">— rows / columns / filters</span></div>
            {ds.dims.map((d) => (
              <div key={d.id} className={`pv-field ${used(d.id) ? 'used' : ''}`} draggable onDragStart={onDragStart({ kind: 'dim', id: d.id })} onDragEnd={onDragEnd} onClick={() => !used(d.id) && clickField({ kind: 'dim', id: d.id })}>
                <span className="setup-check" style={{ width: 15, height: 15 }}>{used(d.id) && <FiCheck size={9} />}</span>{d.label}
                <span className="pv-where">{inRows(d.id) ? 'Rows' : inCols(d.id) ? 'Columns' : inFilters(d.id) ? 'Filter' : ''}</span>
              </div>
            ))}
            <div className="pv-field-group" style={{ marginTop: 10 }}>Values <span className="muted">— numbers to show</span></div>
            {ds.measures.map((m) => (
              <div key={m.id} className={`pv-field ${w.measures.includes(m.id) ? 'used' : ''}`} draggable onDragStart={onDragStart({ kind: 'measure', id: m.id })} onDragEnd={onDragEnd} onClick={() => !w.measures.includes(m.id) && clickField({ kind: 'measure', id: m.id })}>
                <span className="setup-check" style={{ width: 15, height: 15 }}>{w.measures.includes(m.id) && <FiCheck size={9} />}</span><span className="pv-sigma">Σ</span>{m.label}
                <span className="pv-where">{m.agg}</span>
              </div>
            ))}
          </div>

          <div className="pv-zones">
            <div className={`pv-zone ${over === 'filters' ? 'over' : ''}`} {...zoneProps('filters')}>
              <div className="pv-zone-title"><FiFilter size={11} /> Filters</div>
              <div className="pv-zone-body">
                {Object.keys(w.filters).length === 0 && <span className="pv-hint">Drop a field here</span>}
                {Object.keys(w.filters).map((id) => chip('filters', id, `${dimLabel(id)}${w.filters[id].length ? ` (${w.filters[id].length})` : ' (All)'}`, 'dim'))}
              </div>
            </div>
            <div className={`pv-zone ${over === 'cols' ? 'over' : ''}`} {...zoneProps('cols')}>
              <div className="pv-zone-title"><FiColumns size={11} /> Columns</div>
              <div className="pv-zone-body">
                {!w.colDim && <span className="pv-hint">Drop a field here</span>}
                {w.colDim && chip('cols', w.colDim, dimLabel(w.colDim), 'dim')}
              </div>
            </div>
            <div className={`pv-zone ${over === 'rows' ? 'over' : ''}`} {...zoneProps('rows')}>
              <div className="pv-zone-title"><FiList size={11} /> Rows</div>
              <div className="pv-zone-body">
                {w.rowDims.length === 0 && <span className="pv-hint">Drop a field here</span>}
                {w.rowDims.map((id) => chip('rows', id, dimLabel(id), 'dim'))}
              </div>
            </div>
            <div className={`pv-zone ${over === 'values' ? 'over' : ''}`} {...zoneProps('values')}>
              <div className="pv-zone-title"><FiHash size={11} /> Values</div>
              <div className="pv-zone-body">
                {w.measures.length === 0 && <span className="pv-hint">Drop a value here</span>}
                {w.measures.map((id) => chip('values', id, `${measure(id)?.label} (${measure(id)?.agg})`, 'measure'))}
              </div>
            </div>
          </div>

          {openFilter && w.filters[openFilter] && (
            <div className="pv-filter-pop">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <b style={{ fontSize: 12 }}>{dimLabel(openFilter)}</b>
                <span className="flex gap-2">
                  <button className="link" style={{ fontSize: 11 }} onClick={() => set('filters', { ...w.filters, [openFilter]: [] })}>All</button>
                  <button className="link" style={{ fontSize: 11 }} onClick={() => setOpenFilter(null)}>Done</button>
                </span>
              </div>
              <div className="pv-filter-list">
                {dimValues(records, w.dataset, openFilter).map((v) => {
                  const on = w.filters[openFilter].includes(v);
                  return <label key={v} className="pv-filter-opt"><input type="checkbox" checked={on} onChange={() => toggleFilterValue(openFilter, v)} /> {v}</label>;
                })}
              </div>
            </div>
          )}
        </div>

        {/* ---- right: preview ---- */}
        <div className="pv-preview">
          <div className="flex items-center gap-2" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: 1, minWidth: 220 }} placeholder={widgetTitle(w)} value={w.title} onChange={(e) => set('title', e.target.value)} />
            <div className="flex" style={{ gap: 4 }}>
              {WIDGET_VIEWS.map((v) => <button key={v.id} type="button" className={`chip ${w.view === v.id ? 'active' : ''}`} onClick={() => set('view', v.id)} title={v.label}><span style={{ fontSize: 13 }}>{v.icon}</span> {v.label}</button>)}
            </div>
            <PillToggle size="sm" options={WIDTHS} value={w.width} onChange={(v) => set('width', v)} />
          </div>
          <div className="card" style={{ padding: 16, minHeight: 300 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div className="label">Preview · {scope.scopeLabel}</div>
              <div className="muted" style={{ fontSize: 11 }}>{records.length} records</div>
            </div>
            {open && <CustomWidget widget={w} bare />}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
        <span className="muted" style={{ fontSize: 12 }}>{ds?.description}</span>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={() => onSave({ ...w, rowDim: w.rowDims[0] || '', title: w.title || widgetTitle(w) })}>{initial ? 'Save view' : 'Add to my overview'}</button>
        </div>
      </div>
    </Modal>
  );
}
