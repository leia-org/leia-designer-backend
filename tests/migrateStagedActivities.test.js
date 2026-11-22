import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import {
  buildPlan,
  deriveLegacyStageId,
  executePlan,
} from '../scripts/migrate-staged-activities.js';

const { ObjectId } = mongoose.Types;
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeMockDb({ experiments = [], leias = [] }) {
  const bulkWrite = vi.fn(async (ops) => ({
    matchedCount: ops.length,
    modifiedCount: ops.length,
  }));
  return {
    collections: {
      experiments: {
        find: () => ({ toArray: async () => experiments }),
        bulkWrite,
      },
      leias: {
        find: () => ({ toArray: async () => leias }),
      },
    },
    collection(name) {
      return this.collections[name];
    },
  };
}

describe('migrate-staged-activities', () => {
  it('generates deterministic RFC 4122 UUIDv4 stage IDs', () => {
    const id = new ObjectId('6810d000d837e3b9d7f4767f');
    const first = deriveLegacyStageId(id);
    const second = deriveLegacyStageId(String(id));
    expect(first).toMatch(UUID_V4_REGEX);
    expect(first).toBe(second);
  });

  it('migrates legacy single and multi activities, converting ObjectId refs to strings', async () => {
    const expSingleId = new ObjectId();
    const expMultiId = new ObjectId();
    const leia1 = new ObjectId();
    const leia2 = new ObjectId();
    const entry1 = new ObjectId();
    const entry2 = new ObjectId();

    const db = makeMockDb({
      experiments: [
        {
          _id: expSingleId,
          isPublished: true,
          leias: [{ _id: new ObjectId(), leia: leia1, configuration: { mode: 'standard' } }],
        },
        {
          _id: expMultiId,
          isPublished: false,
          orchestration: {
            mode: 'multi',
            maxInternalTurns: 4,
            openingLeiaId: entry2,
            problemLeiaId: entry1,
            sharedTask: 'Collaborate',
          },
          leias: [
            { _id: entry1, leia: leia1, configuration: { mode: 'standard' } },
            { _id: entry2, leia: leia2, configuration: { mode: 'standard' } },
          ],
        },
      ],
      leias: [
        { _id: leia1, isPublished: true, spec: { behaviour: { spec: { description: 'A' } } } },
        { _id: leia2, isPublished: true, spec: { behaviour: { spec: { description: 'B' } } } },
      ],
    });

    const plan = await buildPlan(db);
    expect(plan.blockingIssues).toEqual([]);
    expect(plan.stats).toMatchObject({
      scanned: 2,
      alreadyMigrated: 0,
      toMigrate: 2,
      singleMode: 1,
      multiMode: 1,
      objectIdRefsConverted: 2,
      leiaEntriesReceivingStageId: 3,
      rootOrchestrationToUnset: 1,
    });

    const multiOp = plan.operations[1].updateOne;
    expect(multiOp.update.$unset).toEqual({ orchestration: '' });
    expect(multiOp.update.$set.stages[0].orchestration).toEqual({
      mode: 'multi',
      maxInternalTurns: 4,
      openingLeiaId: String(entry2),
      problemLeiaId: String(entry1),
      sharedTask: 'Collaborate',
    });
    expect(multiOp.update.$set.leias.every((l) => l.stageId === deriveLegacyStageId(expMultiId))).toBe(true);
  });

  it('skips already-migrated staged activities', async () => {
    const expId = new ObjectId();
    const stageId = deriveLegacyStageId(expId);
    const db = makeMockDb({
      experiments: [
        {
          _id: expId,
          stages: [
            {
              id: stageId,
              outputSources: { conversation: null, submitedSolution: null },
              orchestration: {
                mode: 'single',
                maxInternalTurns: 2,
                openingLeiaId: null,
                problemLeiaId: null,
                sharedTask: '',
              },
            },
          ],
          leias: [{ _id: new ObjectId(), stageId, leia: new ObjectId() }],
        },
      ],
    });

    const plan = await buildPlan(db);
    expect(plan.stats.alreadyMigrated).toBe(1);
    expect(plan.operations).toHaveLength(0);
  });

  it('flags invalid MultiLEIA activities as blocking and prevents executePlan', async () => {
    const db = makeMockDb({
      experiments: [
        {
          _id: new ObjectId(),
          orchestration: { mode: 'multi' },
          leias: [{ _id: new ObjectId(), leia: new ObjectId(), configuration: { mode: 'standard' } }],
        },
      ],
    });

    const plan = await buildPlan(db);
    expect(plan.blockingIssues).toHaveLength(1);
    await expect(executePlan(db, plan)).rejects.toThrow(/blocking issue/i);
    expect(db.collections.experiments.bulkWrite).not.toHaveBeenCalled();
  });
});
