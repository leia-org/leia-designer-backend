import { describe, expect, test } from 'vitest';
import {
  createRubricValidator,
  isMarkdownTable,
  parseRubricMarkdown,
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
    })).rejects.toThrow('must contain at least one Markdown table');
  });

  test('requires at least one criterion row', () => {
    expect(isMarkdownTable('| Criterion | Score |\n| --- | --- |')).toBe(false);
  });

  test('parses multiple equally weighted sections', () => {
    const parsed = parseRubricMarkdown(`## Content
| Criterion | Score |
| --- | --- |
| Accuracy | Excellent |

## Presentation
| Criterion | Score |
| --- | --- |
| Clarity | Excellent |`);

    expect(parsed.error).toBeNull();
    expect(parsed.weightingMode).toBe('equal');
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections.map((section) => section.weight)).toEqual([50, 50]);
  });

  test('parses explicit section weights that total 100%', () => {
    const parsed = parseRubricMarkdown(`## Content [70%]
| Criterion | Score |
| --- | --- |
| Accuracy | Excellent |

## Presentation [30%]
| Criterion | Score |
| --- | --- |
| Clarity | Excellent |`);

    expect(parsed.error).toBeNull();
    expect(parsed.weightingMode).toBe('explicit');
    expect(parsed.sections.map((section) => section.weight)).toEqual([70, 30]);
  });

  test('distributes the remaining weight between unweighted sections', () => {
    const parsed = parseRubricMarkdown(`## Content [60%]
| Criterion | Score |
| --- | --- |
| Accuracy | Excellent |

## Delivery
| Criterion | Score |
| --- | --- |
| Clarity | Excellent |

## Timing
| Criterion | Score |
| --- | --- |
| Duration | Excellent |`);

    expect(parsed.error).toBeNull();
    expect(parsed.weightingMode).toBe('mixed');
    expect(parsed.sections.map((section) => section.weight)).toEqual([60, 20, 20]);
  });

  test('rejects explicit weights that do not total 100%', async () => {
    const markdown = `## Content [60%]
| Criterion | Score |
| --- | --- |
| Accuracy | Excellent |

## Presentation [30%]
| Criterion | Score |
| --- | --- |
| Clarity | Excellent |`;

    await expect(createRubricValidator.validateAsync({ name: 'Weighted', markdown }))
      .rejects.toThrow('must total 100%');
  });

  test('rejects a section heading without a table', () => {
    expect(parseRubricMarkdown(`## Content
| Criterion | Score |
| --- | --- |
| Accuracy | Excellent |

## Missing table`).error).toBe('rubric.sectionTable');
  });
});
