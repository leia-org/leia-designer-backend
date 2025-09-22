/**
 * Validates and returns a sanitized visibility parameter
 * @param {string} visibility - The visibility parameter to validate
 * @returns {string} - Valid visibility value ('all', 'public', 'private') or 'all' as default
 */
export const validateVisibility = (visibility) => {
  const allowedVisibility = ['all', 'public', 'private'];
  return visibility && allowedVisibility.includes(visibility) ? visibility : 'all';
};

/**
 * Validates and returns a boolean parameter from query string
 * @param {string} value - The query parameter value to validate
 * @param {boolean} defaultValue - The default value to return if validation fails (default: false)
 * @returns {boolean} - Boolean value or the specified default
 */
export const validateBoolean = (value, defaultValue = false) => {
  if (value && value.toLowerCase() === 'true' || value === '1') return true;
  if (value && value.toLowerCase() === 'false' || value === '0') return false;
  return defaultValue;
};

/**
 * Validates and returns a sanitized process parameter
 * @param {string} process - The process parameter to validate
 * @returns {string|null} - Valid process value ('requirements-elicitation', 'game') or null if invalid/empty
 */
export const validateProcess = (process) => {
  // TODO: When the process table is implemented, fetch allowed processes from there
  const allowedProcesses = ['requirements-elicitation', 'game'];
  return process && allowedProcesses.includes(process) ? process : 'all';
};