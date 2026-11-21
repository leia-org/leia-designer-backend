const BEHAVIOUR_AUTHORING_TOOLS = new Set(['apply_behaviour']);

export const canManageBehaviour = (context = {}) =>
  context.internal === true || context.role === 'advanced' || context.role === 'admin';

export const filterProblemChatToolsForRole = (tools, context = {}) => {
  if (!Array.isArray(tools) || canManageBehaviour(context)) return tools;

  return tools.filter(
    (tool) => !BEHAVIOUR_AUTHORING_TOOLS.has(tool?.name)
  );
};
