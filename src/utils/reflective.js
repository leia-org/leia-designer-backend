export function validateReflectiveChain(experiment) {
  const entries = experiment?.leias || [];
  const reflective = (entry) => entry?.leia?.spec?.behaviour?.spec?.reflective === true;
  for (let index = 0; index < entries.length; index++) {
    if (!reflective(entries[index])) continue;
    const error = (message) => Object.assign(new Error(message), { statusCode: 400 });
    if (experiment.orchestration?.mode === 'multi') throw error('Reflective LEIA requires sequential LN → LR sessions');
    if (index === 0 || reflective(entries[index - 1])) throw error('Each Reflective LEIA must immediately follow a normal LEIA');
    if (entries[index].configuration?.mode === 'transcription') throw error('Reflective LEIA requires an interactive session');
    const spec = entries[index].leia.spec.behaviour.spec;
    if (!spec.evaluationPrompt?.trim() || !spec.stoppingPrompt?.trim()) throw error('Reflective LEIA requires evaluationPrompt and stoppingPrompt');
  }
}
