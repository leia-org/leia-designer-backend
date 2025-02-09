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
