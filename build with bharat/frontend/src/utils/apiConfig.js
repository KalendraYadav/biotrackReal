/**
 * BioTrace Centralized Frontend API Configuration
 * Standardizes API communication using VITE_API_URL environment variable.
 * Defaults to http://localhost:5000/api in development or '/api' when proxied.
 */

const rawApiUrl = import.meta.env.VITE_API_URL;

// Base API URL without trailing slash
export const API_BASE_URL = rawApiUrl
  ? rawApiUrl.replace(/\/$/, '')
  : '/api';

/**
 * Resolves any relative '/api/...' path to the configured API_BASE_URL.
 * If path already begins with http:// or https://, returns it untouched.
 * @param {string} path 
 * @returns {string}
 */
export function resolveApiUrl(path) {
  if (!path || typeof path !== 'string') return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/api')) {
    // If API_BASE_URL is '/api', returns '/api/...'
    // If API_BASE_URL is 'http://localhost:5000/api', replaces leading '/api' with 'http://localhost:5000/api'
    return path.replace(/^\/api/, API_BASE_URL);
  }
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Global fetch interceptor to guarantee that all existing frontend fetch('/api/...') calls
// automatically resolve through the centralized API configuration without editing dozens of components.
if (typeof window !== 'undefined' && window.fetch) {
  const nativeFetch = window.fetch;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string' && resource.startsWith('/api')) {
      return nativeFetch.call(this, resolveApiUrl(resource), init);
    }
    return nativeFetch.call(this, resource, init);
  };
}

export default {
  API_BASE_URL,
  resolveApiUrl
};
