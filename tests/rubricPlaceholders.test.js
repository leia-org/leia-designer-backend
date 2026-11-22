import { describe, expect, test } from 'vitest';
import { resolvePlaceholders } from '../src/utils/leia.js';
import { getStageReferences } from '../src/utils/activityStages.js';

const sampleRubric = {
  _id: 'rubric-1',
  apiVersion: 'v1',
  metadata: { name: 'Interview rubric' },
  spec: {
    evaluationPrompt:
      'Evaluate {{persona.firstName}} interview for {{problem.description}} using {{currentStage.outputs.conversation}} and {{previousStage.outputs.submitedSolution}}.',
    sections: [
      {
        title: 'Content',
        weight: 100,
        levels: ['Initial', 'Proficient'],
        criteria: [
          {
            name: 'Clarity',
            descriptors: [
              { level: 'Initial', description: 'Unclear' },
              { level: 'Proficient', description: 'Clear' },
            ],
          },
        ],
      },
    ],
  },
};

describe('rubric placeholder resolution', () => {
  test('resolves {{rubric.*}} inside behaviour and static LEIA placeholders inside rubric.evaluationPrompt while preserving runtime stage placeholders', () => {
    const entities = {
      persona: { spec: { firstName: 'Elena' } },
      problem: { spec: { description: 'Library booking' } },
      behaviour: {
        spec: {
          role: 'Client',
          description:
            'Ask questions aligned with {{rubric.name}}:\n{{rubric.criteria}}\nFull table:\n{{rubric.markdown}}\nGuide: {{rubric.evaluationPrompt}}',
        },
      },
      rubric: structuredClone(sampleRubric),
    };

    const resolved = resolvePlaceholders(entities);

    expect(resolved.rubric.spec.evaluationPrompt).toBe(
      'Evaluate Elena interview for Library booking using {{currentStage.outputs.conversation}} and {{previousStage.outputs.submitedSolution}}.',
    );
    expect(resolved.behaviour.spec.description).toContain('Interview rubric');
    expect(resolved.behaviour.spec.description).toContain('- Clarity');
    expect(resolved.behaviour.spec.description).toContain('## Content [100%]');
    expect(resolved.behaviour.spec.description).toContain('Evaluate Elena interview for Library booking');
  });

  test('throws 400 when behaviour references {{rubric.*}} without a rubric attached', () => {
    const entities = {
      persona: { spec: { firstName: 'Elena' } },
      problem: { spec: { description: 'Library booking' } },
      behaviour: { spec: { description: 'Follow {{rubric.markdown}}' } },
    };

    expect(() => resolvePlaceholders(entities)).toThrow(/no rubric is attached/i);
  });

  test('detects previousStage output references inside rubric.spec.evaluationPrompt', () => {
    const refs = getStageReferences({
      spec: {
        behaviour: { spec: { description: 'Regular behaviour' } },
        rubric: sampleRubric,
      },
    });
    expect([...refs]).toEqual(['submitedSolution']);
  });
});
