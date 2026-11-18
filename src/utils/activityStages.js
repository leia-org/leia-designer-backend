const referencePattern = /{{\s*previousStage\b([^{}]*)}}/g;
const supportedOutputs = new Set(['.outputs.conversation', '.outputs.submitedSolution']);

export function stageError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

export function hasStageReferences(leia) {
  const description = leia?.spec?.behaviour?.spec?.description || '';
  const references = [...description.matchAll(referencePattern)];
  for (const [, path] of references) {
    if (!supportedOutputs.has(path.trimEnd())) {
      throw stageError(`Unsupported previous stage reference: previousStage${path.trimEnd()}`);
    }
  }
  return references.length > 0;
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
    const references = entries.map((entry) => hasStageReferences(entry.leia)).some(Boolean);
    if (references && index === 0) {
      throw stageError('The first stage cannot use previous stage references');
    }
    if (stage.previousStageId && !(positions.get(stage.previousStageId) < index)) {
      throw stageError(`The source of stage ${number} must be an earlier stage`);
    }
    if (ready && references && !stage.previousStageId) {
      throw stageError(`Select an earlier stage for stage ${number}`);
    }
    if (stage.orchestration.mode === 'multi') validateMulti(entries, stage.orchestration);
  }
}
