import { flattenObject } from './helper.js';
import { getValueFromFlattenedKey, isProcessCompatible } from './helper.js';
/**
 * Throws an error if problem constraints are not met.
 *
 * @param {Object} leia The leia object to check, must have a problem field.
 * @returns {void}
 * @throws {Error} If constraints defined in the problem are not met.
 *
 */
export function checkConstraints(leia) {
  const constrainedTo = leia.problem?.spec?.constrainedTo;
  if (!constrainedTo) return;
  const flattenedConstraints = flattenObject(constrainedTo);
  if (!flattenedConstraints) return;

  // Check if constraints are an object
  if (typeof flattenedConstraints !== 'object' || Array.isArray(flattenedConstraints)) {
    const error = new Error('Constraints must be an object');
    error.statusCode = 400;
    throw error;
  }

  for (const [key, constraintValue] of Object.entries(flattenedConstraints)) {
    const leiaValue = getValueFromFlattenedKey(leia, key);
    if (!leiaValue) {
      const error = new Error(`Constraint not met: ${key}. Value does not exist.`);
      error.statusCode = 400;
      throw error;
    }
    if (key.split('.').at(-1) === 'process') {
      // Check compatibility (at least one process must be in common, intersection must not be empty)
      const isCompatible = isProcessCompatible(leiaValue, constraintValue);
      if (!isCompatible) {
        const error = new Error(
          `Constraint not met: ${key}. No compatible processes found. Expected: ${constraintValue}, got: ${leiaValue}`
        );
        error.statusCode = 400;
        throw error;
      }
    } else {
      // Check if value matches constraint
      if (leiaValue !== constraintValue) {
        const error = new Error(
          `Constraint not met: ${key}. Value does not match. Expected: ${constraintValue}, got: ${leiaValue}`
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }
}
