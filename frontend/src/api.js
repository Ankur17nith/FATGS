/**
 * Backend address for API calls.
 *
 * Development: leave VITE_API_BASE_URL unset; requests go to the same origin and the
 * Vite dev server proxies /api to the backend.
 * Production with the frontend on its own address (for example a static site): set
 * VITE_API_BASE_URL to the backend's public address at build time.
 */
export function makeApiUrl(base) {
  const cleaned = String(base || '').trim().replace(/\/+$/, '');
  return path => `${cleaned}${path}`;
}

export const apiUrl = makeApiUrl(import.meta.env?.VITE_API_BASE_URL);
