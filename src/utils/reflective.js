import { validateStages } from './stages.js';

const contextReference = /{{\s*(?:reflectiveContext|previousStage)\.[\w]+\s*}}/;

export const needsPreviousConversation = (entry) => {
  const spec = { ...entry?.leia?.spec?.behaviour?.spec };
  const dynamics = spec.conversationDynamics || {};
  spec.conversationDynamics = Object.fromEntries(
    Object.entries(dynamics).filter(([, dynamic]) => dynamic?.enabled)
  );
  return contextReference.test(JSON.stringify(spec));
};

export function validateReflectiveChain(experiment) {
  if (Array.isArray(experiment?.stages)) return validateStages(experiment);
  const entries = experiment?.leias || [];
  entries.forEach((entry, index) => {
    if (!needsPreviousConversation(entry)) return;
    const error = (message) => Object.assign(new Error(message), { statusCode: 400 });
    if (experiment.orchestration?.mode === 'multi') throw error('Previous conversation context requires sequential sessions');
    if (index === 0) throw error('A LEIA using reflectiveContext must follow another LEIA in the activity');
    if (entry.configuration?.mode === 'transcription') throw error('Previous conversation context requires an interactive session');
  });
}
