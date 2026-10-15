import { describe, expect, it } from 'vitest';
import {
  canManageBehaviour,
  filterProblemChatToolsForRole,
} from '../src/utils/behaviourPermissions.js';

describe('behaviour permissions', () => {
  it('allows only advanced, admin and internal callers to manage behaviours', () => {
    expect(canManageBehaviour({ role: 'instructor' })).toBe(false);
    expect(canManageBehaviour({ role: 'advanced' })).toBe(true);
    expect(canManageBehaviour({ role: 'admin' })).toBe(true);
    expect(canManageBehaviour({ internal: true })).toBe(true);
  });

  it('removes behaviour-authoring tools from a basic user chat request', () => {
    const tools = [
      { name: 'apply_problem' },
      { name: 'apply_behaviour' },
      { name: 'use_behaviour' },
    ];

    expect(filterProblemChatToolsForRole(tools, { role: 'instructor' })).toEqual([
      { name: 'apply_problem' },
      { name: 'use_behaviour' },
    ]);
    expect(filterProblemChatToolsForRole(tools, { role: 'advanced' })).toEqual(tools);
  });

});
