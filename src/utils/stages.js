// Stage definitions are versioned, serializable data. Implementations own validation,
// participant rendering and output production; activities only order definitions.
const fail = (message) => {
  throw Object.assign(new Error(message), { statusCode: 400 });
};
export const stageTypes = new Map();
export function registerStage(type, implementation) {
  if (stageTypes.has(type)) throw new Error(`Stage already registered: ${type}`);
  if (
    !implementation.outputs ||
    typeof implementation.validate !== 'function' ||
    typeof implementation.artifacts !== 'function'
  ) {
    throw new Error('Stages must declare outputs and implement validate and artifacts');
  }
  stageTypes.set(type, Object.freeze(implementation));
}
const conversationArtifacts = { previousConversation: 'array', previousSolution: 'string' };
function configKeys(config, keys) {
  if (Object.keys(config).some((key) => !keys.includes(key))) fail('Unknown stage configuration field');
}
const entriesFor = (stage, experiment) =>
  (stage.config.leiaIds || [stage.config.leiaId]).map((id) =>
    (experiment.leias || []).find((entry) => String(entry.id || entry._id) === String(id))
  );
registerStage('LEIAStage', {
  outputs: conversationArtifacts,
  references: (stage, experiment) => entriesFor(stage, experiment).flatMap(stageReferences),
  validate(stage, experiment) {
    configKeys(stage.config, ['leiaId']);
    if (typeof stage.config.leiaId !== 'string' || !entriesFor(stage, experiment)[0]?.leia?.spec)
      fail('LEIAStage requires an activity LEIA');
  },
  artifacts: ({ messages = [], session }) => ({
    previousConversation: messages.map((message) => ({
      role: message.isLeia ? 'assistant' : 'user',
      content: message.text,
    })),
    previousSolution: session.result ?? '',
  }),
});
registerStage('MultiLEIAStage', {
  outputs: conversationArtifacts,
  references: (stage, experiment) => entriesFor(stage, experiment).flatMap(stageReferences),
  validate(stage, experiment) {
    configKeys(stage.config, ['leiaIds', 'orchestration']);
    const ids = stage.config.leiaIds;
    if (
      !Array.isArray(ids) ||
      ids.length < 2 ||
      ids.length > 30 ||
      ids.some((id) => typeof id !== 'string') ||
      new Set(ids).size !== ids.length
    )
      fail('MultiLEIAStage requires between two and thirty distinct LEIAs');
    const entries = entriesFor(stage, experiment);
    if (
      entries.some(
        (entry) => !entry?.leia?.spec || entry.configuration?.mode === 'transcription' || entry.runnerConfiguration?.audioMode
      )
    )
      fail('MultiLEIAStage requires existing text LEIAs');
    const orchestration = stage.config.orchestration || {};
    if (typeof orchestration !== 'object' || Array.isArray(orchestration)) fail('Invalid stage orchestration');
    configKeys(orchestration, ['mode', 'openingLeiaId', 'problemLeiaId', 'maxInternalTurns', 'sharedTask']);
    if (
      orchestration.sharedTask != null &&
      (typeof orchestration.sharedTask !== 'string' || orchestration.sharedTask.length > 4000)
    )
      fail('Shared task must be a string of at most 4000 characters');
    for (const key of ['openingLeiaId', 'problemLeiaId']) {
      if (orchestration[key] && !ids.includes(String(orchestration[key]))) fail(`${key} must belong to the stage`);
    }
    const turns = orchestration.maxInternalTurns ?? 2;
    if (!Number.isInteger(turns) || turns < 1 || turns > 8) fail('Maximum internal turns must be between 1 and 8');
    const problem = entries.find(
      (entry) =>
        String(entry.id || entry._id) === String(orchestration.problemLeiaId || orchestration.openingLeiaId || ids[0])
    );
    const process = (value) => [...(value || [])].map(String).sort().join('|');
    if (
      entries.some(
        (entry) =>
          process(entry.leia?.spec?.behaviour?.spec?.process) !== process(problem.leia?.spec?.problem?.spec?.process)
      )
    )
      fail('Every MultiLEIA behaviour must use the shared problem process');
  },
  artifacts: (source) => stageTypes.get('LEIAStage').artifacts(source),
});
registerStage('StaticContentStage', {
  outputs: { content: 'string' },
  validate(stage) {
    configKeys(stage.config, ['content']);
    if (
      typeof stage.config.content !== 'string' ||
      !stage.config.content.trim() ||
      stage.config.content.length > 100000
    )
      fail('StaticContentStage requires content (maximum 100000 characters)');
  },
  artifacts: ({ stage }) => ({ content: stage.config.content }),
});
export function getStageImplementation(stage) {
  const implementation = stageTypes.get(stage.type);
  if (!implementation || stage.version !== 1) fail(`Unsupported stage: ${stage.type} v${stage.version}`);
  return implementation;
}
export function stageReferences(entry) {
  const spec = { ...entry?.leia?.spec?.behaviour?.spec };
  spec.conversationDynamics = Object.fromEntries(
    Object.entries(spec.conversationDynamics || {}).filter(([, dynamic]) => dynamic?.enabled)
  );
  return [...JSON.stringify(spec).matchAll(/{{\s*(?:previousStage|reflectiveContext)\.([\w]+)\s*}}/g)].map(
    (match) => match[1]
  );
}
export function validateStages(experiment) {
  if (!Array.isArray(experiment.stages) || experiment.stages.length > 100)
    fail('Activity stages must be an array of at most 100 stages');
  const ids = new Set();
  experiment.stages.forEach((stage, index) => {
    if (!stage || typeof stage.id !== 'string' || !/^[\w-]{1,100}$/.test(stage.id) || ids.has(stage.id))
      fail('Stages require unique stable IDs');
    ids.add(stage.id);
    if (
      typeof stage.title !== 'string' ||
      !stage.title.trim() ||
      stage.title.length > 200 ||
      !stage.config ||
      typeof stage.config !== 'object' ||
      Array.isArray(stage.config)
    )
      fail('Stage title and configuration are required');
    const implementation = getStageImplementation(stage);
    implementation.validate(stage, experiment);
    const outputs = index ? getStageImplementation(experiment.stages[index - 1]).outputs : {};
    (implementation.references?.(stage, experiment) || []).forEach((key) => {
      if (!Object.hasOwn(outputs, key)) fail(`Stage ${stage.title}: previous stage does not produce ${key}`);
    });
  });
}
export function collectStageArtifacts(stage, source) {
  const implementation = getStageImplementation(stage);
  const values = implementation.artifacts({ ...source, stage });
  for (const [key, type] of Object.entries(implementation.outputs)) {
    if (type === 'array' ? !Array.isArray(values[key]) : typeof values[key] !== type)
      fail(`Invalid stage artifact: ${key}`);
  }
  return Object.fromEntries(Object.keys(implementation.outputs).map((key) => [key, values[key]]));
}

export function nextStage(replication, session) {
  const stages = replication.experiment?.stages;
  if (!stages || !session.stageId) return null;
  const index = stages.findIndex((stage) => stage.id === session.stageId);
  return index < 0 ? null : stages[index + 1] || null;
}
