import { describe, expect, test } from 'vitest';
import { createRubricValidator, isMarkdownTable, parseRubricMarkdown, validateRubric } from '../src/validators/v1/rubricValidator.js';

const section = (weight = 100) => ({
  title: 'Content', weight, levels: ['Emerging', 'Proficient'],
  criteria: [{
    name: 'Accuracy',
    descriptors: [
      { level: 'Emerging', description: 'Some errors' },
      { level: 'Proficient', description: 'Correct result' },
    ],
  }],
});
const validRubric = { apiVersion: 'v1', metadata: { name: 'Programming exercise' }, spec: { sections: [section()] } };

describe('rubric validator', () => {
  test('accepts the canonical structured rubric', async () => {
    await expect(createRubricValidator.validateAsync(validRubric)).resolves.toEqual(validRubric);
  });

  test('rejects the former Markdown persistence contract', async () => {
    await expect(createRubricValidator.validateAsync({
      apiVersion: 'v1', metadata: { name: 'Legacy' }, spec: { markdown: '| A | B |' },
    })).rejects.toThrow('additional properties');
  });

  test('rejects fields outside the JSON Schema', async () => {
    await expect(createRubricValidator.validateAsync({ ...validRubric, metadata: { name: 'Test', description: 'extra' } }))
      .rejects.toThrow('additional properties');
  });

  test('requires weights to total 100', () => {
    expect(validateRubric({ ...validRubric, spec: { sections: [section(60), { ...section(30), title: 'Delivery' }] } }))
      .toContain('Section weights must total 100%');
  });

  test('requires one descriptor for every level', () => {
    const invalid = structuredClone(validRubric);
    invalid.spec.sections[0].criteria[0].descriptors.pop();
    expect(validateRubric(invalid)[0]).toContain('exactly one descriptor');
  });

  test('requires at least one criterion row in Markdown', () => {
    expect(isMarkdownTable('| Criterion | Score |\n| --- | --- |')).toBe(false);
  });

  test('converts equally weighted Markdown into canonical sections', () => {
    const parsed = parseRubricMarkdown(`## Content
| Criterion | Score |
| --- | --- |
| Accuracy | Excellent |

## Presentation
| Criterion | Score |
| --- | --- |
| Clarity | Excellent |`);
    expect(parsed.error).toBeNull();
    expect(parsed.spec.sections.map((item) => item.weight)).toEqual([50, 50]);
    expect(parsed.spec.sections[0].criteria[0].descriptors).toEqual([{ level: 'Score', description: 'Excellent' }]);
  });

  test('converts explicit and mixed weights', () => {
    const parsed = parseRubricMarkdown(`## Content [60%]
| Criterion | Initial | Strong |
| --- | --- | --- |
| Accuracy | Weak | Excellent |

## Delivery
| Criterion | Initial | Strong |
| --- | --- | --- |
| Clarity | Weak | Excellent |

## Timing
| Criterion | Initial | Strong |
| --- | --- | --- |
| Duration | Weak | Excellent |`);
    expect(parsed.error).toBeNull();
    expect(parsed.spec.sections.map((item) => item.weight)).toEqual([60, 20, 20]);
  });

  test('preserves escaped pipes and Markdown line breaks in descriptors', () => {
    const parsed = parseRubricMarkdown(`| Criterion | Strong |\n| --- | --- |\n| Accuracy | Uses A \\| B<br>Clearly |`);
    expect(parsed.error).toBeNull();
    expect(parsed.spec.sections[0].criteria[0].descriptors[0].description).toBe('Uses A | B\nClearly');
  });

  test('rejects invalid Markdown weights and headings without tables', () => {
    expect(parseRubricMarkdown(`## Content [60%]\n| A | B |\n| --- | --- |\n| C | D |`).error).toBe('rubric.weightTotal');
    expect(parseRubricMarkdown(`## Missing table`).error).toBe('rubric.sectionTable');
  });
});
