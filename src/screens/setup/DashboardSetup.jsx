import { useMemo, useState } from 'react';
import { BRAND } from '../../config/brand';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiChevronUp, FiChevronDown, FiArrowRight, FiLayout, FiSliders, FiRotateCcw, FiX, FiPlus, FiEdit2, FiTrash2, FiGrid } from 'react-icons/fi';
import WidgetBuilder from '../../components/widgets/WidgetBuilder';
import { WIDGET_LIBRARY, DATASET_BY_ID, newWidgetId } from '../../utils/datasets';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SECTION_BY_ID, DEFAULT_SECTIONS, savedLayout, packRows } from '../../utils/overviewSections';

const ROLE_LABEL = { national: 'National Head', regional: 'Regional Head', state: 'State Head', branch: 'Branch Head' };

/**
 * Post-login landing page: pick the standard Overview, or build a custom one
 * by switching sections on/off and ordering them. Saved per user in prefs.
 */
export default function DashboardSetup() {
  const { user, isAuthenticated } = useAuth();
  const { prefs, setPref } = useTheme();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const existing = savedLayout(prefs, user?.id);
  const [mode, setMode] = useState(existing?.mode === 'custom' ? 'custom' : null); // nothing pre-ticked: the click is the decision
  // a custom overview is made of the user's own widgets only; it starts empty
  const [sections, setSections] = useState(existing?.mode === 'custom' ? existing.sections : []);
  const [widgets, setWidgets] = useState(existing?.widgets || []); // user-built pivot widgets
  const [builder, setBuilder] = useState(null); // null | { initial } — the open widget builder
  const returning = params.get('from') === 'overview';
  const rows = useMemo(() => packRows(sections, widgets), [sections, widgets]);
  const byId = (id) => SECTION_BY_ID[id] || widgets.find((w) => w.id === id);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const on = (id) => sections.includes(id);
  const toggle = (id) => setSections((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const move = (id, dir) => setSections((s) => {
    const i = s.indexOf(id), j = i + dir;
    if (j < 0 || j >= s.length) return s;
    const n = [...s]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  const save = (m = mode) => {
    setPref('overviewLayout', { ...(prefs.overviewLayout || {}), [user.id]: { mode: m, sections: m === 'standard' ? DEFAULT_SECTIONS : sections, widgets: m === 'standard' ? [] : widgets, savedAt: new Date().toISOString() } });
    navigate('/overview', { replace: true });
  };
  // choosing the standard layout is a one-click decision: save and go
  const chooseStandard = () => { setMode('standard'); save('standard'); };

  // ---- widgets: add / edit / remove; a widget is also a section in the order list ----
  const saveWidget = (w) => {
    setWidgets((ws) => (ws.some((x) => x.id === w.id) ? ws.map((x) => (x.id === w.id ? w : x)) : [...ws, w]));
    setSections((s) => (s.includes(w.id) ? s : [...s, w.id]));
    setBuilder(null);
  };
  const removeWidget = (id) => { setWidgets((ws) => ws.filter((x) => x.id !== id)); setSections((s) => s.filter((x) => x !== id)); };
  const addFromLibrary = (tpl) => saveWidget({ ...tpl, id: newWidgetId() });

  return (
    <div className="setup-page">
      <div className="setup-shell">
        <motion.header className="setup-head" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <div className="setup-eyebrow">{BRAND.company} · {ROLE_LABEL[user.role] || 'User'}</div>
            <h1>{returning ? 'Customise your Overview' : `Welcome${existing ? ' back' : ''}, ${user.name.split(' ')[0]}.`}</h1>
            <p>Choose what you want to see first every day. You can change this any time from the Overview.</p>
          </div>
          {(returning || existing) && <button className="setup-close" onClick={() => navigate('/overview')} title="Back to overview"><FiX size={18} /></button>}
        </motion.header>

        {/* ---- mode choice ---- */}
        <div className="setup-modes">
          <ModeCard active={mode === 'standard'} onClick={chooseStandard} icon={<FiLayout />} badge="Recommended"
            title="Standard overview" text="Everything in the tried-and-tested order: key numbers, application summary, loan flow, trends, target vs achievement, alerts, top performers and activity." cta="Open my dashboard">
            <MiniLayout rows={packRows(DEFAULT_SECTIONS)} />
          </ModeCard>
          <ModeCard active={mode === 'custom'} onClick={() => setMode('custom')} icon={<FiSliders />}
            title="Build my own" text="Start from a blank page and add only the views you want, built from the data — like pivot tables in Excel. Pick a dataset, choose rows, columns and numbers." cta="Build from data">
            <MiniLayout rows={rows} widgets={widgets} />
          </ModeCard>
        </div>

        {/* ---- custom builder ---- */}
        <AnimatePresence initial={false}>
          {mode === 'custom' && (
            <motion.div className="setup-builder" key="builder" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
              <div className="setup-picker">
                <div className="setup-group">
                  <div className="setup-group-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiGrid size={12} /> My views · built from data
                    <button className="link" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'none', letterSpacing: 0 }} onClick={() => setBuilder({ initial: null })}><FiPlus size={12} /> New view</button>
                  </div>
                  <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 10 }}>Each view is a pivot: choose a dataset, what goes in rows and columns, and the numbers to show. Add as many as you like.</p>
                  {widgets.length === 0 && <div className="setup-mini-empty" style={{ border: '1px dashed var(--border-strong)', borderRadius: 10, padding: 22, marginBottom: 12 }}>No views yet — click <b>New view</b> or pick one from the library below.</div>}
                  {widgets.length > 0 && (
                    <div className="setup-grid" style={{ marginBottom: 10 }}>
                      {widgets.map((w) => (
                        <div key={w.id} className={`setup-card ${on(w.id) ? 'on' : ''}`} onClick={() => toggle(w.id)} role="button" tabIndex={0}>
                          <span className="setup-card-ic">{DATASET_BY_ID[w.dataset]?.icon || '▦'}</span>
                          <span className="setup-card-body">
                            <span className="setup-card-title">{w.title}<span className="setup-card-w">{w.width === 'full' ? 'full width' : 'half width'}</span></span>
                            <span className="setup-card-desc">{DATASET_BY_ID[w.dataset]?.label} · {w.view}</span>
                            <span className="flex gap-2" style={{ marginTop: 4 }}>
                              <button className="link" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={(e) => { e.stopPropagation(); setBuilder({ initial: w }); }}><FiEdit2 size={11} /> Edit</button>
                              <button className="link" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }}><FiTrash2 size={11} /> Remove</button>
                            </span>
                          </span>
                          <span className="setup-check">{on(w.id) && <FiCheck size={13} />}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Quick add from library</div>
                  <div className="flex" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {WIDGET_LIBRARY.map((t) => <button key={t.title} type="button" className="chip" onClick={() => addFromLibrary(t)}><FiPlus size={12} /> {t.title}</button>)}
                  </div>
                </div>
              </div>

              <aside className="setup-preview">
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <div className="setup-group-title" style={{ margin: 0 }}>Your layout · {sections.length} view{sections.length === 1 ? '' : 's'}</div>
                  <button className="link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => { setSections([]); setWidgets([]); }}><FiRotateCcw size={12} /> Clear</button>
                </div>
                {sections.length === 0 && <p className="muted">Nothing yet — add a view on the left.</p>}
                <div className="setup-order">
                  {sections.map((id, i) => {
                    const s = byId(id);
                    if (!s) return null;
                    return (
                      <motion.div layout key={id} className={`setup-order-row ${s.width}`} transition={{ type: 'spring', stiffness: 400, damping: 32 }}>
                        <span className="setup-order-n">{i + 1}</span>
                        <span className="setup-order-ic">{s.icon || DATASET_BY_ID[s.dataset]?.icon || '▦'}</span>
                        <span className="flex-1" style={{ fontSize: 12.5, fontWeight: 600 }}>{s.title}</span>
                        <span className="setup-order-btns">
                          <button onClick={() => move(id, -1)} disabled={i === 0} title="Move up"><FiChevronUp size={14} /></button>
                          <button onClick={() => move(id, 1)} disabled={i === sections.length - 1} title="Move down"><FiChevronDown size={14} /></button>
                          <button onClick={() => toggle(id)} title="Remove"><FiX size={14} /></button>
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="setup-group-title" style={{ marginTop: 18 }}>How it will look</div>
                <MiniLayout rows={rows} large widgets={widgets} />
              </aside>
            </motion.div>
          )}
        </AnimatePresence>

        {mode === 'custom' && (
          <motion.footer className="setup-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="muted" style={{ fontSize: 12 }}>{sections.length} view{sections.length === 1 ? '' : 's'} on your overview</span>
            <button className="btn btn-primary" style={{ height: 44, padding: '0 22px', fontSize: 14 }} onClick={() => save('custom')} disabled={sections.length === 0}>
              {returning ? 'Save & go to Overview' : 'Continue to my dashboard'} <FiArrowRight />
            </button>
          </motion.footer>
        )}
      </div>
      {builder && <WidgetBuilder key={builder.initial?.id || 'new'} open initial={builder.initial} onSave={saveWidget} onClose={() => setBuilder(null)} />}
    </div>
  );
}

function ModeCard({ active, onClick, icon, badge, title, text, cta, children }) {
  return (
    <button type="button" className={`setup-mode ${active ? 'on' : ''}`} onClick={onClick}>
      <div className="setup-mode-head">
        <span className="setup-mode-ic">{icon}</span>
        <div className="flex-1">
          <div className="setup-mode-title">{title} {badge && <span className="badge badge-brand" style={{ marginLeft: 6 }}>{badge}</span>}</div>
          <div className="setup-mode-text">{text}</div>
        </div>
        <span className="setup-check">{active && <FiCheck size={13} />}</span>
      </div>
      {children}
      {cta && <span className="setup-mode-cta">{cta} <FiArrowRight size={13} /></span>}
    </button>
  );
}

/** Wireframe of the overview: one bar per row, split when two half-width sections share it */
function MiniLayout({ rows, large, widgets = [] }) {
  const info = (id) => SECTION_BY_ID[id] || widgets.find((w) => w.id === id) || { title: id };
  return (
    <div className={`setup-mini ${large ? 'large' : ''}`}>
      {rows.length === 0 && <div className="setup-mini-empty">Empty</div>}
      {rows.map((r, i) => (
        <div key={i} className="setup-mini-row">
          {r.map((id) => { const s = info(id); return <div key={id} className={`setup-mini-block ${SECTION_BY_ID[id] ? '' : 'widget'}`} title={s.title}>{large && <><span>{s.icon || DATASET_BY_ID[s.dataset]?.icon || '▦'}</span> {s.title}</>}</div>; })}
        </div>
      ))}
    </div>
  );
}
