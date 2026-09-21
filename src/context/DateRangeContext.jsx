import { createContext, useContext, useMemo, useState } from 'react';

const DateRangeContext = createContext(null);

/**
 * Prototype date ranges. `monthsBack` = how many monthly buckets the range spans,
 * `factor` = multiplier applied to monthly figures (for Today / This Week).
 */
export const DATE_RANGES = [
  { id: 'today', label: 'Today', factor: 1 / 22, monthsBack: 1, periodLabel: 'today' },
  { id: 'week', label: 'This Week', factor: 1 / 4.3, monthsBack: 1, periodLabel: 'this week' },
  { id: 'month', label: 'This Month', factor: 1, monthsBack: 1, periodLabel: 'this month' },
  { id: 'lastMonth', label: 'Last Month', factor: 1, monthsBack: 1, offset: 1, periodLabel: 'last month' },
  { id: 'quarter', label: 'This Quarter', factor: 3, monthsBack: 3, periodLabel: 'this quarter' },
  { id: 'year', label: 'This Year', factor: 9, monthsBack: 9, periodLabel: 'this year' },
  { id: 'custom', label: 'Custom', factor: 2, monthsBack: 2, periodLabel: 'selected period' },
];

export function DateRangeProvider({ children }) {
  const [rangeId, setRangeId] = useState(() => { try { return JSON.parse(localStorage.getItem('ff_prefs'))?.defaultRange || 'month'; } catch { return 'month'; } });
  const [custom, setCustom] = useState({ from: '2026-08-01', to: '2026-09-18' });

  const value = useMemo(() => {
    const range = DATE_RANGES.find((r) => r.id === rangeId) || DATE_RANGES[2];
    return {
      rangeId, setRangeId, range, custom, setCustom,
      /** scale a monthly figure to the selected range */
      scale: (monthlyValue) => Math.round(monthlyValue * range.factor),
      /** slice a 12-month series to the selected range */
      sliceMonths: (series) => {
        const off = range.offset || 0;
        const n = range.monthsBack;
        return series.slice(series.length - n - off, series.length - off);
      },
      periodLabel: range.periodLabel,
    };
  }, [rangeId, custom]);

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export const useDateRange = () => useContext(DateRangeContext);
