import {
  flattenObject,
  isObject,
  getValueFromFlattenedKey,
  isProcessCompatible,
  applyExtensionFlattenedKey,
  applyOverrideFlattenedKey,
  replacePlaceholders,
} from './helper.js';
import { buildRubricPlaceholderView } from './rubricFormat.js';
import logger from './logger.js';

const rubricPlaceholderPattern = /{{\s*rubric\.[\w.]+\s*}}/;

function containsRubricPlaceholder(value) {
  if (typeof value === 'string') return rubricPlaceholderPattern.test(value);
  if (Array.isArray(value)) return value.some(containsRubricPlaceholder);
  if (isObject(value)) return Object.values(value).some(containsRubricPlaceholder);
  return false;
}

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

/**
 * A LEIA has a single activity process. The problem is the source of truth,
 * and its process tags are copied to the embedded behaviour before the LEIA
 * is created or versioned.
 */
export function synchronizeProcessTypes(leia) {
  if (!leia.problem?.spec || !leia.behaviour?.spec) return leia;

  const process = Array.isArray(leia.problem.spec.process)
    ? [...leia.problem.spec.process]
    : [];

  leia.problem.spec.process = [...process];
  leia.behaviour.spec.process = [...process];
  return leia;
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
  const hasRubric = Boolean(leia.rubric?.spec);
  if (
    !hasRubric &&
    (containsRubricPlaceholder(leia.behaviour?.spec) || containsRubricPlaceholder(leia.problem?.spec))
  ) {
    const error = new Error('Behaviour or problem references rubric placeholders, but no rubric is attached to this LEIA');
    error.statusCode = 400;
    throw error;
  }

  // Create a view of the leia object with spec fields plus virtual rubric fields
  const view = {
    problem: leia.problem?.spec,
    persona: leia.persona?.spec,
    behaviour: leia.behaviour?.spec,
    ...(hasRubric ? { rubric: buildRubricPlaceholderView(leia.rubric) } : {}),
  };

  for (const entity of ['problem', 'persona']) {
    const leiaEntitySpec = leia[entity]?.spec;
    if (!leiaEntitySpec) {
      logger.warn(`Ignoring: ${entity}. Entity not found.`);
      continue;
    }
    leia[entity].spec = replacePlaceholders(leiaEntitySpec, view);
    view[entity] = leia[entity].spec;
  }

  if (hasRubric) {
    if (typeof leia.rubric.spec.evaluationPrompt === 'string' && leia.rubric.spec.evaluationPrompt) {
      leia.rubric.spec = {
        ...leia.rubric.spec,
        evaluationPrompt: replacePlaceholders(leia.rubric.spec.evaluationPrompt, view),
      };
    }
    view.rubric = buildRubricPlaceholderView(leia.rubric);
  }

  if (leia.behaviour?.spec) {
    leia.behaviour.spec = replacePlaceholders(leia.behaviour.spec, view);
    view.behaviour = leia.behaviour.spec;
  } else {
    logger.warn('Ignoring: behaviour. Entity not found.');
  }

  return leia;
}
