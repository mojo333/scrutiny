// Simple axios instance - no wrapper needed, just configured axios
import axios from 'axios';

// Get base path from URL (handles /web prefix like Angular).
// Match '/web' only as a full path segment so proxy prefixes that merely
// start with those characters (e.g. '/webapps/...') are not truncated.
export function getBasePath(): string {
  const pathname = window.location.pathname;
  const match = pathname.match(/^(.*?)\/web(?:\/|$)/);
  return match ? match[1] : pathname;
}

export function getAppBaseHref(): string {
  return getBasePath() + '/web';
}

// Just a configured axios instance - use it directly in hooks
export const api = axios.create({
  baseURL: `${getBasePath()}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});
