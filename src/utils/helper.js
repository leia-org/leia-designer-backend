/**
 * Validates that the result is not null, undefined, or an empty array.
 * Throws an error with statusCode 404 if validation fails.
 *
 * @param {any} result - The result to validate.
 * @returns {any} - The original result if validation passes.
 * @throws {Error} - An error with statusCode 404 if result is not found.
 */
export function isNotFound(result) {
  return !result || (Array.isArray(result) && result.length === 0);
}

/**
 * Flatten an object to a single level.
 *
 * @param {Object} obj - The object to flatten.
 * @returns {Object} - The flattened object.
 *
 * @example
 * const obj = {
 *  a: {
 *   b: {
 *   c: 1
 *  }
 * }
 * };
 *
 * flattenObject(obj);
 * // Returns { 'a.b.c': 1 }
 *
 */
export function flattenObject(obj) {
  return flattenObjectInit(obj, '', {});
}

function flattenObjectInit(obj, key, res) {
  if (typeof obj === 'object' && obj != null && !Array.isArray(obj)) {
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        const newKey = key ? `${key}.${k}` : k;
        flattenObjectInit(obj[k], newKey, res);
      }
    }
  } else {
    if (key) {
      res[key] = obj;
    } else {
      res = obj;
    }
  }
  return res;
}

/**
 * Get a value from a flattened key.
 * If the key does not exist, return undefined.
 *
 * @param {Object} obj - The object to get the value from.
 * @param {string} key - The flattened key.
 * @returns {any} - The value.
 *
 * @example
 * const obj = {
 * a: {
 *  b: {
 *  c: 1
 * }
 * }
 * };
 *
 * getValueFromFlattenedKey(obj, 'a.b.c');
 * // Returns 1
 *
 */
export function getValueFromFlattenedKey(obj, key) {
  const keys = key.split('.');
  let value = obj;
  for (const k of keys) {
    if (value[k] === undefined) {
      return undefined;
    }
    value = value[k];
  }
  return value;
}

/**
 * Check if two processes are compatible.
 * At least one process must be in common.
 *
 * @param {string|string[]} p1 - The first process or array of processes.
 * @param {string|string[]} p2 - The second process or array of processes.
 * @returns {boolean} - True if the processes are compatible, false otherwise.
 */
export function isProcessCompatible(p1, p2) {
  if (!p1 || !p2) {
    return false;
  }
  p1 = Array.isArray(p1) ? p1 : [p1];
  p2 = Array.isArray(p2) ? p2 : [p2];
  console.log(p1, p2);
  if (p1.length >= p2.length) {
    const s = new Set(p1);
    return p2.some((v) => s.has(v));
  } else {
    const s = new Set(p2);
    return p1.some((v) => s.has(v));
  }
}
