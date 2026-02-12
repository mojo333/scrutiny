// Simple axios instance - no wrapper needed, just configured axios
import axios from 'axios';

// Get base path from URL (handles /web prefix like Angular)
export function getBasePath(): string {
  return window.location.pathname.split('/web').slice(0, 1)[0];
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
