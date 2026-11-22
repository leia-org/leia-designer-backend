const escapeCell = (value) =>
  String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');

const formatWeight = (weight) =>
  Number.isInteger(weight) ? String(weight) : String(Number(weight.toFixed(6)));

export function serializeRubricMarkdown(spec) {
  if (!spec || !Array.isArray(spec.sections)) return '';
  return spec.sections
    .map((section) => {
      const levels = Array.isArray(section.levels) ? section.levels : [];
      const criteria = Array.isArray(section.criteria) ? section.criteria : [];
      const header = ['Criterion', ...levels].map(escapeCell);
      const rows = criteria.map((criterion) => {
        const byLevel = new Map(
          (criterion.descriptors || []).map((descriptor) => [descriptor.level, descriptor.description]),
        );
        return [criterion.name, ...levels.map((level) => byLevel.get(level) ?? '')].map(escapeCell);
      });
      return [
        `## ${section.title} [${formatWeight(section.weight)}%]`,
        `| ${header.join(' | ')} |`,
        `| ${header.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.join(' | ')} |`),
      ].join('\n');
    })
    .join('\n\n');
}

export function formatRubricCriteriaSummary(spec) {
  if (!spec || !Array.isArray(spec.sections)) return '';
  return spec.sections
    .map((section) => {
      const levels = Array.isArray(section.levels) ? section.levels.join(' -> ') : '';
      const criteriaLines = (section.criteria || []).map((criterion) => `- ${criterion.name}`);
      return [
        `${section.title} (${formatWeight(section.weight)}%)${levels ? ` [Levels: ${levels}]` : ''}`,
        ...criteriaLines,
      ].join('\n');
    })
    .join('\n\n');
}

export function buildRubricPlaceholderView(rubric) {
  if (!rubric?.spec) return undefined;
  return {
    name: rubric.metadata?.name || '',
    evaluationPrompt: rubric.spec.evaluationPrompt || '',
    markdown: serializeRubricMarkdown(rubric.spec),
    criteria: formatRubricCriteriaSummary(rubric.spec),
    sections: JSON.stringify(rubric.spec.sections || []),
  };
}
