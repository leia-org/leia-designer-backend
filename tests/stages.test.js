import { beforeEach, expect, test, vi } from 'vitest';
vi.mock('../src/repositories/v1/ExperimentRepository.js', () => ({
  default: {
    findByIdPopulated: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    deleteLeia: vi.fn(),
  },
}));
vi.mock('../src/utils/authClient.js', () => ({ populateUserInEntity: vi.fn((entity) => entity) }));
vi.mock('../src/repositories/v1/LeiaRepository.js', () => ({ default: { findById: vi.fn() } }));
import LeiaRepository from '../src/repositories/v1/LeiaRepository.js';
import ExperimentService from '../src/services/v1/ExperimentService.js';
import ExperimentRepository from '../src/repositories/v1/ExperimentRepository.js';
import { updateExperimentStagesValidator } from '../src/validators/v1/experimentValidator.js';
import { resolvePlaceholders } from '../src/utils/leia.js';
import { validateStages } from '../src/utils/stages.js';

const intro = {
  id: 'intro',
  type: 'StaticContentStage',
  title: 'Introduction',
  version: 1,
  config: { content: 'Hello' },
};
beforeEach(() => {
  vi.resetAllMocks();
  ExperimentRepository.findByIdPopulated.mockResolvedValue({ leias: [], stages: [intro] });
  ExperimentRepository.update.mockImplementation(async (_id, data) => data);
});
test('new activities are authored as stage sequences', async () => {
  await ExperimentService.create({ name: 'Activity' });
  expect(ExperimentRepository.create).toHaveBeenCalledWith({ name: 'Activity', stages: [] });
});
test('the quick LEIA-to-activity shortcut also creates a stage sequence', async () => {
  LeiaRepository.findById.mockResolvedValue({ metadata: { name: 'Guide' }, spec: { behaviour: { spec: {} } } });
  await ExperimentService.create({ name: 'Activity', leias: [{ leia: 'template' }], isPublished: true });
  const data = ExperimentRepository.create.mock.calls[0][0];
  expect(data.stages).toEqual([
    {
      id: `leia-${data.leias[0]._id}`,
      type: 'LEIAStage',
      version: 1,
      title: 'Guide',
      config: { leiaId: String(data.leias[0]._id) },
    },
  ]);
});
test('saves and publishes static-only activities without a LEIA', async () => {
  expect(await ExperimentService.updateStages('activity', [intro])).toEqual({ stages: [intro] });
  expect(await ExperimentService.publish('activity')).toEqual({ isPublished: true });
});
test('rejects empty published activities and duplicate stage IDs before writing', async () => {
  await expect(ExperimentService.updateStages('activity', [intro, intro])).rejects.toThrow(/unique/);
  expect(ExperimentRepository.update).not.toHaveBeenCalled();
  ExperimentRepository.findByIdPopulated.mockResolvedValue({ leias: [], stages: [] });
  await expect(ExperimentService.publish('activity')).rejects.toThrow(/stage/);
});
test('protects resources referenced by stages from deletion', async () => {
  ExperimentRepository.findByIdPopulated.mockResolvedValue({
    leias: [],
    stages: [{ ...intro, type: 'LEIAStage', config: { leiaId: 'used' } }],
  });
  await expect(ExperimentService.deleteLeia('activity', 'used')).rejects.toThrow(/Remove this LEIA/);
  expect(ExperimentRepository.deleteLeia).not.toHaveBeenCalled();
});
test('validates the wire format and rejects unknown config fields', () => {
  expect(updateExperimentStagesValidator.validate({ stages: [intro] }).error).toBeUndefined();
  expect(updateExperimentStagesValidator.validate({ stages: [{ ...intro, version: 2 }] }).error).toBeDefined();
  expect(() => validateStages({ stages: [{ ...intro, config: { ...intro.config, leiaId: 'injected' } }] })).toThrow(
    /Unknown/
  );
});
test('preserves previousStage references during static LEIA composition', () => {
  const value = {
    persona: { spec: { firstName: 'Ada' } },
    problem: { spec: {} },
    behaviour: { spec: { description: '{{persona.firstName}}: {{previousStage.content}}' } },
  };
  expect(resolvePlaceholders(value).behaviour.spec.description).toBe('Ada: {{previousStage.content}}');
});

test('rejects dangling LEIA references before saving or starting a stage', () => {
  const missing = { id: 'missing', leia: null };
  const stages = [{ ...intro, type: 'LEIAStage', config: { leiaId: 'missing' } }];
  expect(() => validateStages({ leias: [missing], stages })).toThrow(/requires an activity LEIA/);
  const multi = [{ ...intro, type: 'MultiLEIAStage', config: { leiaIds: ['missing', 'other'] } }];
  expect(() => validateStages({ leias: [missing, { ...missing, id: 'other' }], stages: multi })).toThrow(/existing text LEIAs/);
});
