import { flattenObject, isObject } from './helper.js';
import {
  getValueFromFlattenedKey,
  isProcessCompatible,
  applyExtensionFlattenedKey,
  applyOverrideFlattenedKey,
  replacePlaceholders,
} from './helper.js';
import logger from './logger.js';

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

  // Check if constraints is an object
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

export function resolveExtensions(leia) {
  const extensions = leia.problem?.spec?.extends;
  if (!extensions) return leia;
  const flattenedExtensions = flattenObject(extensions);
  if (!flattenedExtensions) return leia;

  // Check if extensions is an object
  if (!isObject(flattenedExtensions)) {
    const error = new Error('Extensions must be an object');
    error.statusCode = 400;
    throw error;
  }

  for (const [key, value] of Object.entries(flattenedExtensions)) {
    if (key.split('.').at(1) !== 'spec') {
      logger.warn(`Ignoring extension: ${key}. Extensions must be in the spec field.`);
      continue;
    }
    applyExtensionFlattenedKey(leia, key, value);
  }
  return leia;
}

export function resolveOverrides(leia) {
  const overrides = leia.problem?.spec?.overrides;
  if (!overrides) return leia;
  const flattenedOverrides = flattenObject(overrides);
  if (!flattenedOverrides) return leia;

  // Check if overrides is an object
  if (!isObject(flattenedOverrides)) {
    const error = new Error('Overrides must be an object');
    error.statusCode = 400;
    throw error;
  }

  for (const [key, value] of Object.entries(flattenedOverrides)) {
    if (key.split('.').at(1) !== 'spec') {
      logger.warn(`Ignoring override: ${key}. Overrides must be in the spec field.`);
      continue;
    }
    applyOverrideFlattenedKey(leia, key, value);
  }
  return leia;
}

export function resolvePlaceholders(leia) {
  const replacementOrder = ['problem', 'persona', 'behaviour'];

  // Create a view of the leia object with only the spec fields
  const view = Object.fromEntries(Object.entries(leia).map(([key, value]) => [key, value?.spec]));

  for (const entity of replacementOrder) {
    const leiaEntitySpec = leia[entity]?.spec;

    if (!leiaEntitySpec) {
      logger.warn(`Ignoring: ${entity}. Entity not found.`);
      continue;
    }

    // Replace placeholders in the object
    leia[entity].spec = replacePlaceholders(leiaEntitySpec, view);

    // Update the view
    view[entity] = leia[entity].spec;
  }
  return leia;
}
