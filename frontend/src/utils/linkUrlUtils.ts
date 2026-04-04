/**
 * Default matches backend `app.shortlink.baseUrl`.
 * Override with `VITE_SHORTLINK_BASE_URL` in `.env` if your short domain differs.
 */
const SHORTLINK_BASE =
  (typeof import.meta.env.VITE_SHORTLINK_BASE_URL === 'string'
    ? import.meta.env.VITE_SHORTLINK_BASE_URL
    : 'https://health.networks.howard.edu'
  ).replace(/\/$/, '');

/**
 * Pool rows sometimes store only a path (e.g. {@code /s/K9CSI7}). SMS uses absolute URLs;
 * normalize so dashboard links and copy match what was sent.
 */
export function normalizeShortLinkUrl(url: string | null | undefined): string | null {
  if (url == null || url.trim() === '') return null;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return SHORTLINK_BASE + u;
  return u;
}

/**
 * Mirrors backend LinkUrlUtils: append uid query param as sent in SMS/email.
 */
function containsUidParameter(url: string): boolean {
  const q = url.indexOf('?');
  if (q < 0) return false;
  const query = url.slice(q + 1);
  for (const part of query.split('&')) {
    if (part.startsWith('uid=') || part.startsWith('uid%3D')) return true;
  }
  return false;
}

/** Same as backend: remove `uid` query param (e.g. short links should not show uid in UI). */
export function withoutUidParameter(url: string | null | undefined): string | null {
  if (url == null || url.trim() === '') return url ?? null;
  const u = url.trim();
  const q = u.indexOf('?');
  if (q < 0) return u;
  const base = u.slice(0, q);
  const query = u.slice(q + 1);
  const kept = query
    .split('&')
    .filter((p) => p !== '')
    .filter((p) => {
      const name = p.includes('=') ? p.slice(0, p.indexOf('=')) : p;
      return name !== 'uid';
    });
  if (kept.length === 0) return base;
  return `${base}?${kept.join('&')}`;
}

export function appendParticipantUid(
  url: string | null | undefined,
  publicUid: string | null | undefined
): string | null {
  if (url == null || url.trim() === '' || publicUid == null || publicUid.trim() === '') {
    return url ?? null;
  }
  if (containsUidParameter(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + 'uid=' + publicUid;
}
