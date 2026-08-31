import Ajv from 'ajv';
import rubricDefinitionSchema from '../../schemas/v1/rubricSchema.js';

const splitCells = (line) => line
  .replace(/^\||\|$/g, '')
  .split(/(?<!\\)\|/)
  .map((cell) => cell.trim().replace(/\\\|/g, '|').replace(/<br\s*\/?\s*>/gi, '\n'));

const tableAt = (lines, index) => {
  if (index + 2 >= lines.length || !lines[index].includes('|')) return null;
  const headers = splitCells(lines[index]);
  const separators = splitCells(lines[index + 1]);
  if (headers.length < 2 || separators.length !== headers.length ||
      !separators.every((column) => /^:?-{3,}:?$/.test(column))) return null;
  const rows = [];
  let lastRowIndex = index + 1;
  for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
    const row = splitCells(lines[rowIndex]);
    if (!lines[rowIndex].includes('|') || row.length !== headers.length) break;
    rows.push(row);
    lastRowIndex = rowIndex;
  }
  return rows.length ? { headers, rows, lastRowIndex } : null;
};

export function parseRubricMarkdown(value) {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsedSections = [];
  let pendingHeading = null;
  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index].match(/^#{2,6}\s+(.+?)\s*$/);
    if (headingMatch) {
      if (pendingHeading) return { spec: null, sections: [], error: 'rubric.sectionTable' };
      const rawTitle = headingMatch[1];
      const weightMatch = rawTitle.match(/\s*\[(-?\d+(?:[.,]\d+)?)%\]\s*$/);
      pendingHeading = {
        title: (weightMatch ? rawTitle.slice(0, weightMatch.index) : rawTitle).trim() || `Section ${parsedSections.length + 1}`,
        explicitWeight: weightMatch ? Number(weightMatch[1].replace(',', '.')) : null,
      };
      continue;
    }
    const table = tableAt(lines, index);
    if (!table) continue;
    if (table.headers.some((header) => !header) || table.rows.some((row) => row.some((cell) => !cell))) {
      return { spec: null, sections: [], error: 'rubric.emptyCell' };
    }
    parsedSections.push({
      title: pendingHeading?.title || (parsedSections.length === 0 ? 'General' : `Section ${parsedSections.length + 1}`),
      explicitWeight: pendingHeading?.explicitWeight ?? null,
      headers: table.headers,
      rows: table.rows,
    });
    pendingHeading = null;
    index = table.lastRowIndex;
  }
  if (pendingHeading) return { spec: null, sections: [], error: 'rubric.sectionTable' };
  if (!parsedSections.length) return { spec: null, sections: [], error: 'rubric.markdownTable' };

  const explicit = parsedSections.filter((section) => section.explicitWeight !== null);
  if (explicit.some((section) => section.explicitWeight <= 0 || section.explicitWeight > 100)) {
    return { spec: null, sections: [], error: 'rubric.invalidWeight' };
  }
  const explicitTotal = explicit.reduce((total, section) => total + section.explicitWeight, 0);
  const automaticCount = parsedSections.length - explicit.length;
  const epsilon = 0.001;
  if (explicitTotal > 100 + epsilon || (automaticCount === 0 && Math.abs(explicitTotal - 100) > epsilon)) {
    return { spec: null, sections: [], error: 'rubric.weightTotal' };
  }
  if (automaticCount > 0 && explicit.length > 0 && 100 - explicitTotal <= epsilon) {
    return { spec: null, sections: [], error: 'rubric.weightRemaining' };
  }
  const automaticWeight = explicit.length === 0 ? 100 / parsedSections.length : (100 - explicitTotal) / automaticCount;
  const sections = parsedSections.map((section) => ({
    title: section.title,
    weight: section.explicitWeight ?? automaticWeight,
    levels: section.headers.slice(1),
    criteria: section.rows.map((row) => ({
      name: row[0],
      descriptors: section.headers.slice(1).map((level, levelIndex) => ({ level, description: row[levelIndex + 1] })),
    })),
  }));
  return {
    spec: { sections }, sections,
    weightingMode: explicit.length === 0 ? 'equal' : automaticCount === 0 ? 'explicit' : 'mixed',
    error: null,
  };
}

export const isMarkdownTable = (value) => parseRubricMarkdown(value).error === null;

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(rubricDefinitionSchema);

export function validateRubricSemantics(value) {
  const errors = [];
  const totalWeight = value.spec.sections.reduce((total, section) => total + section.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.001) errors.push('Section weights must total 100%');
  if (JSON.stringify(value.spec).length > 50000) errors.push('Rubric content must not exceed 50000 characters');
  value.spec.sections.forEach((section, sectionIndex) => {
    if (!section.title.trim() || section.levels.some((level) => !level.trim())) {
      errors.push(`spec.sections[${sectionIndex}] text fields must not be blank`);
    }
    const expected = new Set(section.levels);
    section.criteria.forEach((criterion, criterionIndex) => {
      const actual = criterion.descriptors.map((descriptor) => descriptor.level);
      if (!criterion.name.trim() || criterion.descriptors.some((descriptor) => !descriptor.description.trim())) {
        errors.push(`spec.sections[${sectionIndex}].criteria[${criterionIndex}] text fields must not be blank`);
      }
      if (actual.length !== expected.size || new Set(actual).size !== actual.length || actual.some((level) => !expected.has(level))) {
        errors.push(`spec.sections[${sectionIndex}].criteria[${criterionIndex}] must contain exactly one descriptor for every section level`);
      }
    });
  });
  return errors;
}

export function validateRubric(value) {
  if (!validateSchema(value)) {
    return (validateSchema.errors || []).map((error) => `${error.instancePath || 'rubric'} ${error.message}`);
  }
  return validateRubricSemantics(value);
}

const validator = {
  async validateAsync(value) {
    const normalized = structuredClone(value);
    if (typeof normalized?.metadata?.name === 'string') normalized.metadata.name = normalized.metadata.name.trim();
    const errors = validateRubric(normalized);
    if (errors.length) {
      const error = new Error(errors.join('; '));
      error.statusCode = 400;
      throw error;
    }
    return normalized;
  },
};

export const createRubricValidator = validator;
export const updateRubricValidator = validator;
