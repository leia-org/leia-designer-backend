import Joi from 'joi';

export function isMarkdownTable(value) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cells = (line) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  for (let index = 0; index < lines.length - 2; index += 1) {
    const header = cells(lines[index]);
    const separator = cells(lines[index + 1]);
    const row = cells(lines[index + 2]);
    if (
      lines[index].includes('|') &&
      header.length >= 2 &&
      separator.length === header.length &&
      separator.every((column) => /^:?-{3,}:?$/.test(column)) &&
      row.length === header.length
    ) {
      return true;
    }
  }

  return false;
}

const markdownTable = Joi.string()
  .trim()
  .min(1)
  .max(50000)
  .custom((value, helpers) => (
    isMarkdownTable(value) ? value : helpers.error('rubric.markdownTable')
  ), 'Markdown table validation')
  .messages({
    'rubric.markdownTable': '{{#label}} must contain a Markdown table with a header, separator, and at least one criterion row',
  });

export const createRubricValidator = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().trim().allow('').max(500).default(''),
  markdown: markdownTable.required(),
});

export const updateRubricValidator = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().trim().allow('').max(500).default(''),
  markdown: markdownTable.required(),
});
