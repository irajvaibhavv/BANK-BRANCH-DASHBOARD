import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  DATA, LEVELS, branchesIn, officersIn, dsasIn, filesIn, statesIn, scopeFor, breadcrumbsFor,
  scopeName, aggregateBranches, aggregateMonthly, childUnits, applyFocus, focusLabel,
} from '../utils/scopeHelpers';

const ScopeContext = createContext(null);

function jurisdictionScope(user) {
  if (!user) return { level: 'national' };
  const j = user.jurisdiction || {};
  if (j.branchId) return { level: 'branch', ...j };
  if (j.stateId) return { level: 'state', ...j };
  if (j.regionId) return { level: 'regional', ...j };
  return { level: 'national' };
}

export function ScopeProvider({ children }) {
  const { user } = useAuth();
  const rootScope = useMemo(() => jurisdictionScope(user), [user]);
  const [scope, setScope] = useState(rootScope);
  const [focus, setFocusState] = useState(null); // { type: 'area'|'officer'|'dsa', id } — only meaningful inside a branch

  // when login changes, reset to the user's jurisdiction
  useEffect(() => { setScope(rootScope); setFocusState(null); }, [rootScope]);
  // leaving the branch clears the focus
  useEffect(() => { if (scope.level !== 'branch') setFocusState(null); }, [scope.level]);
  const setFocus = useCallback((f) => setFocusState(f && f.id ? f : null), []);

  const drillDown = useCallback((level, id) => setScope((cur) => scopeFor(level, id, cur)), []);
  const drillUp = useCallback(() => setScope((cur) => {
    const idx = LEVELS.indexOf(cur.level);
    const rootIdx = LEVELS.indexOf(rootScope.level);
    if (idx <= rootIdx) return cur;
    const crumbs = breadcrumbsFor(cur, rootScope.level);
    const parent = crumbs[crumbs.length - 2];
    return parent ? scopeFor(parent.level, parent.id, cur) : rootScope;
  }), [rootScope]);
  const resetScope = useCallback(() => setScope(rootScope), [rootScope]);
  const goTo = useCallback((level, id) => setScope((cur) => (level === 'national' ? { level: 'national' } : scopeFor(level, id, cur))), []);

  const value = useMemo(() => {
    const branches = branchesIn(scope);
    const focused = applyFocus(scope.level === 'branch' ? focus : null, {
      branches, officers: officersIn(scope), dsas: dsasIn(scope), loanFiles: filesIn(scope),
      agg: aggregateBranches(branches), monthly: aggregateMonthly(branches), children: childUnits(scope),
    });
    const agg = focused.agg;
    const label = scopeName(scope);
    return {
      focus: scope.level === 'branch' ? focus : null, setFocus, focusLabel: focusLabel(focus),
      userRole: user?.role || 'national',
      userJurisdiction: user?.jurisdiction || {},
      rootScope,
      currentScope: scope,
      level: scope.level,
      canDrillUp: LEVELS.indexOf(scope.level) > LEVELS.indexOf(rootScope.level),
      drillDown, drillUp, resetScope, goTo,
      breadcrumbs: breadcrumbsFor(scope, rootScope.level),
      scopeLabel: focus && scope.level === 'branch' ? `${label} · ${focusLabel(focus)}` : label,
      // filtered datasets
      branches,
      officers: focused.officers,
      dsas: focused.dsas,
      loanFiles: focused.loanFiles,
      states: statesIn(scope),
      regions: scope.regionId ? DATA.regions.filter((r) => r.id === scope.regionId) : DATA.regions,
      agg,
      monthly: focused.monthly,
      children: focused.children,
      getFilteredData: (name) => {
        switch (name) {
          case 'branches': return branches;
          case 'officers': return focused.officers;
          case 'dsas': return focused.dsas;
          case 'loanFiles': return focused.loanFiles;
          case 'states': return statesIn(scope);
          default: return [];
        }
      },
    };
  }, [scope, rootScope, user, focus, setFocus, drillDown, drillUp, resetScope, goTo]);

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export const useScopeContext = () => useContext(ScopeContext);
