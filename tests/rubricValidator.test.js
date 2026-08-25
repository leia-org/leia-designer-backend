import { describe, expect, test } from 'vitest';
import {
  createRubricValidator,
  isMarkdownTable,
} from '../src/validators/v1/rubricValidator.js';

const validMarkdown = `| Criterion | Emerging | Proficient |
| --- | --- | --- |
| Accuracy | Some errors | Correct result |`;

describe('rubric validator', () => {
  test('accepts a rubric containing a Markdown table', async () => {
    const value = await createRubricValidator.validateAsync({
      name: 'Programming exercise',
      description: 'Evaluation guide',
      markdown: validMarkdown,
    });

    expect(value.markdown).toBe(validMarkdown);
    expect(isMarkdownTable(validMarkdown)).toBe(true);
  });

  test('rejects Markdown without a table', async () => {
    await expect(createRubricValidator.validateAsync({
      name: 'Programming exercise',
      markdown: '# General notes',
    })).rejects.toThrow('must contain a Markdown table');
  });

  test('requires at least one criterion row', () => {
    expect(isMarkdownTable('| Criterion | Score |\n| --- | --- |')).toBe(false);
  });
});
