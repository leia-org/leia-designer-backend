import { describe, expect, test } from 'vitest';
import { createBehaviourValidator, updateBehaviourValidator } from '../src/validators/v1/behaviourValidator.js';

const config = {
  leiaSpeaksFirst: { enabled: true, config: { firstMessage: 'Preséntate' } },
  stoppingCondition: { enabled: true, config: { condition: 'El estudiante no coopera' } },
};
const resource = (dynamics) => ({ apiVersion: 'v1', metadata: { name: 'test', version: '1.0.0' },
  spec: { description: 'Client', ...(dynamics ? { conversationDynamics: dynamics } : {}) } });

describe('Conversation Dynamics authoring contract', () => {
  for (const [name, validator] of [['create', createBehaviourValidator], ['update', updateBehaviourValidator]]) {
    test(`${name} preserves both independently enabled options`, () => {
      const result = validator.validate(resource(config), { stripUnknown: true });
      expect(result.error).toBeUndefined();
      expect(result.value.spec.conversationDynamics).toEqual(config);
    });
    test(`${name} accepts legacy behaviours`, () => {
      expect(validator.validate(resource()).error).toBeUndefined();
    });
    for (const [id, field] of [['leiaSpeaksFirst', 'firstMessage'], ['stoppingCondition', 'condition']]) {
      test(`${name} requires nonblank ${id} configuration only when enabled`, () => {
        for (const text of ['', '   ', undefined]) {
          expect(validator.validate(resource({ [id]: { enabled: true, config: { [field]: text } } })).error).toBeDefined();
        }
        expect(validator.validate(resource({ [id]: { enabled: false, config: { [field]: '' } } })).error).toBeUndefined();
      });
    }
    test(`${name} preserves future dynamic config`, () => {
      const future = { pacing: { enabled: true, config: { delay: 5 } } };
      const result = validator.validate(resource(future), { stripUnknown: true });
      expect(result.error).toBeUndefined();
      expect(result.value.spec.conversationDynamics).toEqual(future);
      expect(validator.validate(resource({ pacing: { config: {} } })).error).toBeDefined();
    });
  }
});
