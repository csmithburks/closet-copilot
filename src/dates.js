// Calendar dates as 'YYYY-MM-DD' strings, so time zones never shift a day.
const pad = (n) => String(n).padStart(2, '0');
const utc = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (t) => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && fromUtc(utc(s)) === s;
export const today = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
export const addDays = (s, n) => fromUtc(utc(s) + n * 86400000);
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
export const addYears = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  return fromUtc(Date.UTC(y + n, m - 1, d));
};
export function dateRange(start, end) {
  const out = [];
  for (let d = start; d <= end && out.length < 60; d = addDays(d, 1)) out.push(d);
  return out;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDay = (s) => {
  const d = new Date(utc(s));
  return `${DOW[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
};
export const formatSpan = (a, b) => {
  const x = new Date(utc(a));
  const y = new Date(utc(b));
  const left = `${MON[x.getUTCMonth()]} ${x.getUTCDate()}`;
  if (a === b) return left;
  return x.getUTCMonth() === y.getUTCMonth() ? `${left}–${y.getUTCDate()}` : `${left} – ${MON[y.getUTCMonth()]} ${y.getUTCDate()}`;
};
