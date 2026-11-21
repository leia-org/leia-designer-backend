import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function deriveLegacyStageId(seed) {
  const hash = createHash('sha256')
    .update(`leia-legacy-stage:v1:${String(seed)}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function normalizeLegacyOrchestration(orch, leias, stats) {
  const mode = orch?.mode === 'multi' ? 'multi' : 'single';
  const sharedTask = typeof orch?.sharedTask === 'string' ? orch.sharedTask : '';

  if (mode !== 'multi') {
    return {
      mode: 'single',
      maxInternalTurns: 2,
      openingLeiaId: null,
      problemLeiaId: null,
      sharedTask,
    };
  }

  const rawTurns = Number(orch?.maxInternalTurns);
  const maxInternalTurns = Number.isFinite(rawTurns)
    ? Math.min(Math.max(Math.trunc(rawTurns), 1), 8)
    : 2;

  const rawOpening = orch?.openingLeiaId;
  const rawProblem = orch?.problemLeiaId;
  if (rawOpening != null && typeof rawOpening !== 'string') stats.objectIdRefsConverted += 1;
  if (rawProblem != null && typeof rawProblem !== 'string') stats.objectIdRefsConverted += 1;

  const openingLeiaId = rawOpening != null ? String(rawOpening) : String(leias[0]._id);
  const problemLeiaId = rawProblem != null ? String(rawProblem) : openingLeiaId;

  return {
    mode: 'multi',
    maxInternalTurns,
    openingLeiaId,
    problemLeiaId,
    sharedTask,
  };
}

export async function buildPlan(db) {
  const experimentsCollection = db.collection('experiments');
  const leiasCollection = db.collection('leias');

  const [experiments, leiasDocs] = await Promise.all([
    experimentsCollection.find({}).toArray(),
    leiasCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            isPublished: 1,
            'spec.behaviour.spec.description': 1,
          },
        }
      )
      .toArray(),
  ]);

  const leiaById = new Map(leiasDocs.map((doc) => [String(doc._id), doc]));

  const stats = {
    scanned: experiments.length,
    alreadyMigrated: 0,
    toMigrate: 0,
    singleMode: 0,
    multiMode: 0,
    objectIdRefsConverted: 0,
    leiaEntriesReceivingStageId: 0,
    rootOrchestrationToUnset: 0,
  };

  const blockingIssues = [];
  const warnings = {
    publishedZeroLeias: [],
    draftZeroLeias: [],
    missingLeiaRefs: [],
    previousStageRefsInSingleStage: [],
  };
  const operations = [];

  for (const exp of experiments) {
    const expId = String(exp._id);
    const leias = Array.isArray(exp.leias) ? exp.leias : [];
    const hasStages = Array.isArray(exp.stages) && exp.stages.length > 0;
    const hasRootOrchestration = Object.prototype.hasOwnProperty.call(exp, 'orchestration');
    const missingStageIdCount = leias.filter((entry) => !entry.stageId).length;

    if (hasStages && !hasRootOrchestration && missingStageIdCount === 0) {
      stats.alreadyMigrated += 1;
      continue;
    }

    if (hasStages && exp.stages.length > 1 && missingStageIdCount > 0) {
      blockingIssues.push({
        experimentId: expId,
        reason: 'Multi-stage experiment has LEIA entries missing stageId',
      });
      continue;
    }

    const stageId = hasStages ? exp.stages[0].id : deriveLegacyStageId(exp._id);
    const sourceOrch = hasStages ? exp.stages[0].orchestration : exp.orchestration;
    const leiaIds = new Set(leias.map((entry) => String(entry._id)));

    if (sourceOrch?.mode === 'multi') {
      if (leias.length < 2) {
        blockingIssues.push({
          experimentId: expId,
          reason: 'MultiLEIA activity has fewer than 2 LEIAs',
        });
        continue;
      }
      if (leias.some((entry) => entry.configuration?.mode === 'transcription')) {
        blockingIssues.push({
          experimentId: expId,
          reason: 'MultiLEIA activity contains a LEIA in transcription mode',
        });
        continue;
      }
      for (const field of ['openingLeiaId', 'problemLeiaId']) {
        const refVal = sourceOrch[field];
        if (refVal != null && !leiaIds.has(String(refVal))) {
          blockingIssues.push({
            experimentId: expId,
            reason: `orchestration.${field} (${String(refVal)}) does not match any LEIA in the activity`,
          });
        }
      }
      if (blockingIssues.some((issue) => issue.experimentId === expId)) continue;
    }

    if (leias.length === 0) {
      if (exp.isPublished) warnings.publishedZeroLeias.push(expId);
      else warnings.draftZeroLeias.push(expId);
    }

    let hasMissingLeiaRef = false;
    let hasPrevStageRef = false;
    for (const entry of leias) {
      const target = leiaById.get(String(entry.leia));
      if (!target) {
        hasMissingLeiaRef = true;
      } else {
        const desc = target.spec?.behaviour?.spec?.description || '';
        if (/{{\s*previousStage\b/.test(desc)) {
          hasPrevStageRef = true;
        }
      }
    }
    if (hasMissingLeiaRef) warnings.missingLeiaRefs.push(expId);
    if (hasPrevStageRef && (!hasStages || exp.stages.length === 1)) {
      warnings.previousStageRefsInSingleStage.push(expId);
    }

    const normalizedOrch = normalizeLegacyOrchestration(sourceOrch, leias, stats);
    const nextStages = hasStages
      ? exp.stages.map((stage, idx) =>
          idx === 0
            ? {
                ...stage,
                outputSources: stage.outputSources ?? {
                  conversation: null,
                  submitedSolution: null,
                },
                orchestration: normalizedOrch,
              }
            : stage
        )
      : [
          {
            id: stageId,
            outputSources: {
              conversation: null,
              submitedSolution: null,
            },
            orchestration: normalizedOrch,
          },
        ];

    const nextLeias = leias.map((entry) =>
      entry.stageId ? entry : { ...entry, stageId }
    );

    stats.toMigrate += 1;
    if (normalizedOrch.mode === 'multi') stats.multiMode += 1;
    else stats.singleMode += 1;
    stats.leiaEntriesReceivingStageId += missingStageIdCount;
    if (hasRootOrchestration) stats.rootOrchestrationToUnset += 1;

    const update = {
      $set: {
        stages: nextStages,
        leias: nextLeias,
      },
    };
    if (hasRootOrchestration) {
      update.$unset = { orchestration: '' };
    }

    operations.push({
      updateOne: {
        filter: {
          _id: exp._id,
          $or: [
            { stages: { $exists: false } },
            { stages: { $size: 0 } },
            { orchestration: { $exists: true } },
            { 'leias.stageId': { $exists: false } },
          ],
        },
        update,
      },
    });
  }

  return {
    stats,
    blockingIssues,
    warnings,
    operations,
  };
}

export async function executePlan(db, plan) {
  if (plan.blockingIssues.length > 0) {
    throw new Error(
      `Cannot apply migration with ${plan.blockingIssues.length} blocking issue(s)`
    );
  }
  if (plan.operations.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }
  return db.collection('experiments').bulkWrite(plan.operations, { ordered: true });
}

function printReport(plan, { apply, verbose, dbName }) {
  const { stats, blockingIssues, warnings } = plan;
  console.log(apply ? 'Mode: APPLY' : 'Mode: DRY RUN (pass --apply to write changes)');
  if (dbName) console.log(`Database: ${dbName}`);
  console.log(`Experiments scanned: ${stats.scanned}`);
  console.log(`  Already migrated (valid staged, no root orchestration): ${stats.alreadyMigrated}`);
  console.log(`  To migrate: ${stats.toMigrate}`);
  console.log(`    - Single mode: ${stats.singleMode}`);
  console.log(
    `    - Multi mode: ${stats.multiMode} (ObjectId refs converted to string: ${stats.objectIdRefsConverted})`
  );
  console.log(`  LEIA entries receiving stageId: ${stats.leiaEntriesReceivingStageId}`);
  console.log(`  Root orchestration fields to unset: ${stats.rootOrchestrationToUnset}`);
  console.log(`Blocking issues: ${blockingIssues.length}`);
  if (verbose && blockingIssues.length > 0) {
    for (const issue of blockingIssues) {
      console.log(`  [BLOCKING] ${issue.experimentId}: ${issue.reason}`);
    }
  }
  console.log('Warnings:');
  console.log(`  - Published activities with 0 LEIAs: ${warnings.publishedZeroLeias.length}`);
  console.log(`  - Drafts with 0 LEIAs: ${warnings.draftZeroLeias.length}`);
  console.log(`  - Activities with missing LEIA reference: ${warnings.missingLeiaRefs.length}`);
  console.log(
    `  - Single-stage activities with previousStage refs: ${warnings.previousStageRefsInSingleStage.length}`
  );
  if (verbose) {
    if (warnings.publishedZeroLeias.length) {
      console.log(`    publishedZeroLeias: ${warnings.publishedZeroLeias.join(', ')}`);
    }
    if (warnings.draftZeroLeias.length) {
      console.log(`    draftZeroLeias: ${warnings.draftZeroLeias.join(', ')}`);
    }
    if (warnings.missingLeiaRefs.length) {
      console.log(`    missingLeiaRefs: ${warnings.missingLeiaRefs.join(', ')}`);
    }
    if (warnings.previousStageRefsInSingleStage.length) {
      console.log(
        `    previousStageRefsInSingleStage: ${warnings.previousStageRefsInSingleStage.join(', ')}`
      );
    }
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const verbose = process.argv.includes('--verbose');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const db = mongoose.connection.db;
    const plan = await buildPlan(db);
    printReport(plan, { apply, verbose, dbName: db.databaseName });

    if (!apply) return;

    const result = await executePlan(db, plan);
    console.log(
      `Experiments matched: ${result.matchedCount}, modified: ${result.modifiedCount}`
    );
  } finally {
    await mongoose.disconnect();
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}
