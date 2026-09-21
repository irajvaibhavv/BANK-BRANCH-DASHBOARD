/**
 * Sections a user can put on their Overview. Order here = the standard (default) layout.
 * width: 'full' takes a whole row, 'half' blocks are packed two per row in the order chosen.
 */
export const OVERVIEW_SECTIONS = [
  { id: 'insights', group: 'At a glance', title: 'Smart insights bar', icon: '✨', width: 'full', description: 'One-line AI-style insights for the current scope, with quick views.' },
  { id: 'kpis', group: 'At a glance', title: 'Key numbers', icon: '📊', width: 'full', description: 'Disbursement, active loan files, DSA network and target achievement with month-on-month change.' },
  { id: 'summary', group: 'At a glance', title: 'Application summary', icon: '🗂️', width: 'full', description: 'Pending, approved, rejected, disbursed and incomplete file tiles — each opens the pipeline filtered.' },
  { id: 'funnel', group: 'Loan flow', title: 'Where files are lost', icon: '🔻', width: 'half', description: 'Received → decided → approved → disbursed funnel with approval and disbursement rates.' },
  { id: 'decisions', group: 'Loan flow', title: 'Decisions by month', icon: '⚖️', width: 'half', description: 'Approved vs rejected files, month by month.' },
  { id: 'portfolio', group: 'Business', title: 'Portfolio by product', icon: '🏷️', width: 'half', description: 'Sanctioned and disbursed amount by loan type.' },
  { id: 'trend', group: 'Business', title: 'Disbursement trend', icon: '📈', width: 'half', description: '6 or 12-month disbursement with target achievement table.' },
  { id: 'tva', group: 'Business', title: 'Target vs achievement', icon: '🎯', width: 'full', description: 'Every unit under you against its target — click a bar to drill down.' },
  { id: 'alerts', group: 'People & attention', title: 'Alerts & attention needed', icon: '⚠️', width: 'half', description: 'Open alerts inside your scope.' },
  { id: 'top', group: 'People & attention', title: 'Top performers', icon: '🏆', width: 'half', description: 'Highest target achievement among your units.' },
  { id: 'productivity', group: 'People & attention', title: 'BO productivity & coverage', icon: '🧭', width: 'full', description: 'Coverage, visit-to-file, collection and customer spread per officer, with red flags. Not on by default.', optional: true },
  { id: 'activity', group: 'People & attention', title: 'Recent activity', icon: '🕒', width: 'full', description: 'Latest events across the network.' },
];

export const SECTION_BY_ID = Object.fromEntries(OVERVIEW_SECTIONS.map((s) => [s.id, s]));
export const DEFAULT_SECTIONS = OVERVIEW_SECTIONS.filter((s) => !s.optional).map((s) => s.id);
export const GROUPS = [...new Set(OVERVIEW_SECTIONS.map((s) => s.group))];

/** The saved layout for a user, or null if they have not set one up yet */
export function savedLayout(prefs, userId) {
  return prefs?.overviewLayout?.[userId] || null;
}

/** User-built pivot widgets saved with the layout (ids start with "w:") */
export function widgetsFor(prefs, userId) {
  return savedLayout(prefs, userId)?.widgets || [];
}
export const isWidgetId = (id) => typeof id === 'string' && id.startsWith('w:');

/** Ordered list of section / widget ids to render for a user */
export function sectionsFor(prefs, userId) {
  const l = savedLayout(prefs, userId);
  if (!l || l.mode === 'standard') return DEFAULT_SECTIONS;
  const widgets = new Set((l.widgets || []).map((w) => w.id));
  return l.sections.filter((id) => SECTION_BY_ID[id] || widgets.has(id));
}

/** Pack an ordered list of section ids into rows: halves pair up, fulls stand alone. `widgets` supplies widths for widget ids. */
export function packRows(ids, widgets = []) {
  const rows = [];
  let pending = null;
  ids.forEach((id) => {
    const s = SECTION_BY_ID[id] || widgets.find((w) => w.id === id);
    if (!s) return;
    if (s.width === 'full') {
      if (pending) { rows.push([pending]); pending = null; }
      rows.push([id]);
    } else if (pending) {
      rows.push([pending, id]); pending = null;
    } else {
      pending = id;
    }
  });
  if (pending) rows.push([pending]);
  return rows;
}
