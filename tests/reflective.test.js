import { describe, expect, test } from 'vitest';
import { createBehaviourValidator, updateBehaviourValidator } from '../src/validators/v1/behaviourValidator.js';
import { resolvePlaceholders } from '../src/utils/leia.js';
import { validateReflectiveChain } from '../src/utils/reflective.js';
import Behaviour from '../src/models/Behaviour.js';

const entry = (description) => ({ leia: { spec: { behaviour: { spec: { description } } } } });

describe('Behaviour with optional conversation controls', () => {
  test('accepts optional stopping and opening instructions without reflective fields', () => {
    const spec = { description: 'Guide the student', conversationDynamics: {
      stoppingCondition: { enabled: true, prompt: 'Stop after two answers' },
      speaksFirst: { enabled: true, prompt: 'Ask how they started' },
    } };
    const data = { apiVersion: 'v1', metadata: { name: 'Guide', version: '1.0.0' }, spec };
    for (const schema of [createBehaviourValidator, updateBehaviourValidator]) {
      expect(schema.validate(data).error).toBeUndefined();
      expect(schema.validate({ ...data, spec: { description: 'Plain' } }).error).toBeUndefined();
      expect(schema.validate({ ...data, spec: { ...spec, conversationDynamics: { ...spec.conversationDynamics, stoppingCondition: { enabled: true, prompt: '' } } } }).error).toBeDefined();
      expect(schema.validate({ ...data, spec: { ...spec, conversationDynamics: { ...spec.conversationDynamics, stoppingCondition: { enabled: false, prompt: '' } } } }).error).toBeUndefined();
      expect(schema.validate({ ...data, spec: { ...spec, stoppingPrompt: 'Old field' } }).error).toBeDefined();
      expect(schema.validate({ ...data, spec: { ...spec, reflective: true } }).error).toBeDefined();
      expect(schema.validate({ ...data, spec: { ...spec, evaluationPrompt: 'Old field' } }).error).toBeDefined();
    }
    expect(new Behaviour({ ...data, metadata: { name: 'Guide' } }).toJSON().spec).toMatchObject(spec);
  });

  test('preserves runtime context variables during static composition', () => {
    const leia = { persona: { spec: { firstName: 'Ada' } }, problem: { spec: {} },
      behaviour: { spec: { description: '{{persona.firstName}}: {{reflectiveContext.previousConversation}}' } } };
    expect(resolvePlaceholders(leia).behaviour.spec.description).toBe('Ada: {{reflectiveContext.previousConversation}}');
  });

  test('requires a preceding LEIA only when context is referenced', () => {
    const normal = entry('Normal');
    const contextual = entry('{{reflectiveContext.previousSolution}}');
    expect(() => validateReflectiveChain({ leias: [normal, contextual, contextual] })).not.toThrow();
    expect(() => validateReflectiveChain({ leias: [normal, entry('Stop here')] })).not.toThrow();
    const inactive = { leia: { spec: { behaviour: { spec: { conversationDynamics: { stoppingCondition: { enabled: false, prompt: '{{reflectiveContext.previousSolution}}' } } } } } } };
    expect(() => validateReflectiveChain({ leias: [inactive] })).not.toThrow();
    expect(() => validateReflectiveChain({ leias: [contextual] })).toThrow(/follow another/);
    expect(() => validateReflectiveChain({ leias: [normal, contextual], orchestration: { mode: 'multi' } })).toThrow(/sequential/);
  });
});
