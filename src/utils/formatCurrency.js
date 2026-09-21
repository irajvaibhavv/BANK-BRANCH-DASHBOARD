/**
 * Indian currency & number formatting.
 *  formatCurrency(45000)        -> "₹45,000"
 *  formatCurrency(4520000)      -> "₹45.2 L"
 *  formatCurrency(84700000)     -> "₹8.47 Cr"
 *  formatCurrency(84700000, { long: true }) -> "₹8.47 Crore"
 *  formatIndian(12345678)       -> "1,23,45,678"
 */

export function formatIndian(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return (neg ? '-' : '') + s;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + rest + ',' + last3;
}

export function formatCurrency(amount, opts = {}) {
  const { long = false, decimals } = opts;
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const neg = amount < 0;
  const abs = Math.abs(amount);
  let out;
  if (abs >= 1e7) {
    const v = abs / 1e7;
    out = `₹${trim(v, decimals ?? 2)} ${long ? 'Crore' : 'Cr'}`;
  } else if (abs >= 1e5) {
    const v = abs / 1e5;
    out = `₹${trim(v, decimals ?? (v >= 10 ? 1 : 2))} ${long ? 'Lakh' : 'L'}`;
  } else {
    out = `₹${formatIndian(abs)}`;
  }
  return neg ? `-${out}` : out;
}

/** Short form without the rupee symbol, for chart axes: 8.4Cr, 45L, 12K */
export function formatAxis(amount) {
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `${trim(abs / 1e7, 1)}Cr`;
  if (abs >= 1e5) return `${trim(abs / 1e5, 0)}L`;
  if (abs >= 1e3) return `${trim(abs / 1e3, 0)}K`;
  return `${abs}`;
}

function trim(v, d) {
  const f = v.toFixed(d);
  return f.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
