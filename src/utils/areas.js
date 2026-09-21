/**
 * Localities a branch's DSAs (and customers) are spread across.
 * One shared mapping so the map, the overview filter and the tables all agree
 * on which area a DSA belongs to. Offsets are degrees from the branch pin.
 */
export const LOCALITIES = [
  ['Station Road', 0.018, 0.004], ['Civil Lines', -0.014, 0.016], ['Main Market', 0.004, -0.015], ['Industrial Estate', 0.03, -0.02],
  ['Old City', -0.024, -0.008], ['Bypass Road', 0.022, 0.024], ['University Area', -0.006, 0.03], ['Cantonment', -0.03, 0.02],
];
export const AREA_NAMES = LOCALITIES.map((l) => l[0]);

export const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** [name, dx, dy] of the locality a DSA sits in — deterministic per DSA id */
export const dsaArea = (d) => LOCALITIES[hash(d.id) % LOCALITIES.length];
export const dsaAreaName = (d) => dsaArea(d)[0];
