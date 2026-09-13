import { describe, expect, test } from 'vitest';
import { createBehaviourValidator, updateBehaviourValidator } from '../src/validators/v1/behaviourValidator.js';
import { resolvePlaceholders } from '../src/utils/leia.js';
import { validateReflectiveChain } from '../src/utils/reflective.js';
import Behaviour from '../src/models/Behaviour.js';

const normal = { leia: { spec: { behaviour: { spec: {} } } } };
const spec = { reflective: true, evaluationPrompt: 'Explain your decisions', stoppingPrompt: 'Stop after two justified answers' };
const reflective = { leia: { spec: { behaviour: { spec } } } };

describe('Reflective authoring', () => {
  test('validates creation and versioning and preserves new behaviour fields', () => {
    const data = { apiVersion: 'v1', metadata: { name: 'Reflective', version: '1.0.0' }, spec };
    for (const schema of [createBehaviourValidator, updateBehaviourValidator]) {
      expect(schema.validate(data).error).toBeUndefined();
      expect(schema.validate({ ...data, spec: { ...spec, evaluationPrompt: ' ' } }).error).toBeDefined();
      expect(schema.validate({ ...data, spec: { ...spec, stoppingPrompt: '' } }).error).toBeDefined();
      expect(schema.validate({ ...data, spec: { description: 'Normal' } }).error).toBeUndefined();
    }
    const model = new Behaviour({ ...data, metadata: { name: 'Reflective' } });
    expect(model.toJSON().spec).toMatchObject(spec);
  });
  test('leaves runtime variables intact while resolving static variables', () => {
    const leia = {
      persona: { spec: { firstName: 'Ada' } },
      problem: { spec: {} },
      behaviour: { spec: { description: '{{persona.firstName}}: {{reflectiveContext.previousConversation}}', evaluationPrompt: '{{ reflectiveContext.previousSolution }}' } },
    };
    expect(resolvePlaceholders(leia).behaviour.spec).toEqual({
      description: 'Ada: {{reflectiveContext.previousConversation}}', evaluationPrompt: '{{ reflectiveContext.previousSolution }}',
    });
  });
  test('permits pairs and normal-only activities, rejects orphan and consecutive reflections', () => {
    for (const leias of [[normal], [normal, reflective], [normal, reflective, normal, reflective]]) {
      expect(() => validateReflectiveChain({ leias })).not.toThrow();
    }
    for (const leias of [[reflective], [normal, reflective, reflective]]) {
      expect(() => validateReflectiveChain({ leias })).toThrow(/immediately follow/);
    }
    expect(() => validateReflectiveChain({ leias: [normal, reflective], orchestration: { mode: 'multi' } })).toThrow(/sequential/);
  });
});
