const referencePattern = /{{\s*previousStage\b([^{}]*)}}/g;
export const STAGE_OUTPUTS = ['conversation', 'submitedSolution', 'problem'];
export const PREVIOUS_STAGE_PROBLEM_FIELDS = [
  'description',
  'details',
  'personaBackground',
  'solution',
  'initialSolution',
  'solutionFormat',
  'evaluationPrompt',
  'process',
];
const supportedOutputs = new Map([
  ['.outputs.conversation', 'conversation'],
  ['.outputs.submitedSolution', 'submitedSolution'],
  ...PREVIOUS_STAGE_PROBLEM_FIELDS.map((field) => [`.leia.problem.${field}`, 'problem']),
]);
const outputLabels = {
  conversation: 'conversation',
  submitedSolution: 'submitted solution',
  problem: 'problem',
};

export function stageError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

export function getStageReferences(leia) {
  const templates = [
    leia?.spec?.behaviour?.spec?.description || '',
    leia?.spec?.rubric?.spec?.evaluationPrompt || '',
  ];
  const outputs = new Set();
  for (const template of templates) {
    const references = [...template.matchAll(referencePattern)];
    for (const [, path] of references) {
      const output = supportedOutputs.get(path.trimEnd());
      if (!output) {
        throw stageError(`Unsupported previous stage reference: previousStage${path.trimEnd()}`);
      }
      outputs.add(output);
    }
  }
  return outputs;
}

export function hasStageReferences(leia) {
  return getStageReferences(leia).size > 0;
}

export function getStageOutputSource(stage, output) {
  return stage?.outputSources?.[output] ?? null;
}

export function validateActivityStages(stages, leias, validateMulti, ready = false) {
  const positions = new Map(stages.map(({ id }, index) => [id, index]));
  if (!stages.length || positions.size !== stages.length) {
    throw stageError('An activity requires at least one stage and unique stage IDs');
  }
  if (leias.some((entry) => !positions.has(entry.stageId))) {
    throw stageError('Move or remove the LEIAs before removing their stage');
  }

  for (const [index, stage] of stages.entries()) {
    const number = index + 1;
    const entries = leias.filter((entry) => entry.stageId === stage.id);
    if (ready && !entries.length) throw stageError(`Stage ${number} requires at least one LEIA`);
    const referencedOutputs = new Set();
    for (const entry of entries) {
      const entryRefs = getStageReferences(entry.leia);
      if (entryRefs.size > 0 && entry.configuration?.mode === 'transcription') {
        throw stageError(
          `Stage ${number} cannot use transcription mode because it uses outputs from an earlier stage`
        );
      }
      for (const output of entryRefs) {
        referencedOutputs.add(output);
      }
    }
    if (referencedOutputs.size > 0 && index === 0) {
      throw stageError('The first stage cannot use previous stage references');
    }
    const configuredSources = STAGE_OUTPUTS.map((output) => stage.outputSources?.[output]).filter(Boolean);
    for (const sourceId of configuredSources) {
      if (!(positions.get(sourceId) < index)) {
        throw stageError(`The source of stage ${number} must be an earlier stage`);
      }
    }
    const conversationSourceId = getStageOutputSource(stage, 'conversation');
    if (referencedOutputs.has('conversation') && conversationSourceId) {
      const sourceIndex = positions.get(conversationSourceId);
      const sourceEntries = leias.filter((entry) => entry.stageId === conversationSourceId);
      if (sourceEntries.some((entry) => entry.configuration?.mode === 'transcription')) {
        throw stageError(
          `Stage ${sourceIndex + 1} cannot use transcription mode because stage ${number} uses its conversation`
        );
      }
    }
    if (ready) {
      for (const output of referencedOutputs) {
        if (!getStageOutputSource(stage, output)) {
          throw stageError(`Select an earlier stage for ${outputLabels[output]} in stage ${number}`);
        }
      }
    }
    if (stage.orchestration.mode === 'multi') validateMulti(entries, stage.orchestration);
  }
}
