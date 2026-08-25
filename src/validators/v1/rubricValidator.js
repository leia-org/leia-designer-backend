import Joi from 'joi';

const splitCells = (line) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());

const tableAt = (lines, index) => {
  if (index + 2 >= lines.length || !lines[index].includes('|')) return null;

  const headers = splitCells(lines[index]);
  const separators = splitCells(lines[index + 1]);
  if (
    headers.length < 2 ||
    separators.length !== headers.length ||
    !separators.every((column) => /^:?-{3,}:?$/.test(column))
  ) {
    return null;
  }

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
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = [];
  let pendingHeading = null;

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index].match(/^#{2,6}\s+(.+?)\s*$/);
    if (headingMatch) {
      if (pendingHeading) return { sections: [], error: 'rubric.sectionTable' };
      const rawTitle = headingMatch[1];
      const weightMatch = rawTitle.match(/\s*\[(-?\d+(?:[.,]\d+)?)%\]\s*$/);
      const explicitWeight = weightMatch
        ? Number(weightMatch[1].replace(',', '.'))
        : null;
      const title = weightMatch ? rawTitle.slice(0, weightMatch.index).trim() : rawTitle.trim();
      pendingHeading = { title: title || `Section ${sections.length + 1}`, explicitWeight };
      continue;
    }

    const table = tableAt(lines, index);
    if (!table) continue;

    sections.push({
      title: pendingHeading?.title || (sections.length === 0 ? 'General' : `Section ${sections.length + 1}`),
      explicitWeight: pendingHeading?.explicitWeight ?? null,
      headers: table.headers,
      rows: table.rows,
    });
    pendingHeading = null;
    index = table.lastRowIndex;
  }

  if (pendingHeading) return { sections: [], error: 'rubric.sectionTable' };
  if (!sections.length) return { sections: [], error: 'rubric.markdownTable' };

  const explicitSections = sections.filter((section) => section.explicitWeight !== null);
  if (explicitSections.some((section) => section.explicitWeight <= 0 || section.explicitWeight > 100)) {
    return { sections: [], error: 'rubric.invalidWeight' };
  }

  const explicitTotal = explicitSections.reduce((total, section) => total + section.explicitWeight, 0);
  const automaticCount = sections.length - explicitSections.length;
  const epsilon = 0.001;

  if (explicitTotal > 100 + epsilon) return { sections: [], error: 'rubric.weightTotal' };
  if (automaticCount === 0 && Math.abs(explicitTotal - 100) > epsilon) {
    return { sections: [], error: 'rubric.weightTotal' };
  }
  if (automaticCount > 0 && explicitSections.length > 0 && 100 - explicitTotal <= epsilon) {
    return { sections: [], error: 'rubric.weightRemaining' };
  }

  const automaticWeight = explicitSections.length === 0
    ? 100 / sections.length
    : (100 - explicitTotal) / automaticCount;

  return {
    sections: sections.map((section) => ({
      ...section,
      weight: section.explicitWeight ?? automaticWeight,
    })),
    weightingMode: explicitSections.length === 0
      ? 'equal'
      : automaticCount === 0 ? 'explicit' : 'mixed',
    error: null,
  };
}

export function isMarkdownTable(value) {
  return parseRubricMarkdown(value).error === null;
}

const markdownTable = Joi.string()
  .trim()
  .min(1)
  .max(50000)
  .custom((value, helpers) => {
    const parsed = parseRubricMarkdown(value);
    return parsed.error ? helpers.error(parsed.error) : value;
  }, 'Markdown rubric validation')
  .messages({
    'rubric.markdownTable': '{{#label}} must contain at least one Markdown table with a header, separator, and criterion row',
    'rubric.sectionTable': 'Each section heading in {{#label}} must be followed by a valid Markdown table',
    'rubric.invalidWeight': 'Section weights in {{#label}} must be greater than 0% and at most 100%',
    'rubric.weightTotal': 'Explicit section weights in {{#label}} must total 100%',
    'rubric.weightRemaining': 'Unweighted sections in {{#label}} must have a percentage remaining to distribute',
  });

export const createRubricValidator = Joi.object({
  apiVersion: Joi.string().valid('v1').required(),
  metadata: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
  }).required(),
  spec: Joi.object({
    markdown: markdownTable.required(),
  }).required(),
});

export const updateRubricValidator = Joi.object({
  apiVersion: Joi.string().valid('v1').required(),
  metadata: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
  }).required(),
  spec: Joi.object({
    markdown: markdownTable.required(),
  }).required(),
});
