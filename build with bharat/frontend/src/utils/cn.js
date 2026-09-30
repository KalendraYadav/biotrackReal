/**
 * Utility helper to join class names safely without extra dependencies.
 * @param  {...any} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default cn;
