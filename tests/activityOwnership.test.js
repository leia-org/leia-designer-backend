import { describe, expect, test, vi, afterEach } from 'vitest';
vi.mock('../src/models/Experiment.js', () => ({ default: { find: vi.fn() } }));
import Experiment from '../src/models/Experiment.js';
import repository from '../src/repositories/v1/ExperimentRepository.js';
import { getAccessibleExperiments, getExperimentById } from '../src/controllers/v1/experimentController.js';
import service from '../src/services/v1/ExperimentService.js';
afterEach(() => vi.restoreAllMocks());
function results(rows) {
  const chain = { sort: vi.fn().mockReturnThis(), populate: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(rows) };
  Experiment.find.mockReturnValue(chain);
  return chain;
}
describe('activity ownership', () => {
  test('queries own activities and foreign published activities', async () => {
    results([]);
    await repository.findAccessible('owner');
    expect(Experiment.find).toHaveBeenCalledWith({ $or: [{ user: 'owner' }, { isPublished: true }] });
  });
  test('combines ownership, search and cursor before paginating', async () => {
    const chain = results(Array.from({ length: 11 }, (_, i) => ({ id: String(i) })));
    const page = await repository.findAccessible('owner', true, '012345678901234567890123', 'my activity');
    const query = Experiment.find.mock.lastCall[0];
    expect(query.user).toBe('owner');
    expect(query.$or).toBeUndefined();
    expect(query._id.$gt.toString()).toBe('012345678901234567890123');
    expect(query.name.test('My great activity')).toBe(true);
    expect(chain.limit).toHaveBeenCalledWith(11);
    expect(page.experiments).toHaveLength(10);
    expect(page.nextCursor).toBe('9');
  });
  test('final full page has no next cursor', async () => {
    results(Array.from({ length: 10 }, (_, i) => ({ id: String(i) })));
    expect((await repository.findAccessible('owner')).nextCursor).toBeNull();
  });
  test('uses authenticated user for ownership', async () => {
    const spy = vi.spyOn(service, 'findAccessible').mockResolvedValue({ experiments: [] });
    await getAccessibleExperiments({ auth: { payload: { id: 'owner' } }, query: { ownedOnly: 'true', userId: 'other' } }, { json: vi.fn() }, vi.fn());
    expect(spy).toHaveBeenCalledWith('owner', true, undefined, undefined);
  });
  test.each([{ ownedOnly: 'invalid' }, { lastActivityId: 'invalid' }, { text: {} }])('rejects invalid filters %j', async (query) => {
    const next = vi.fn();
    await getAccessibleExperiments({ query }, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });
  test.each([true, false])('foreign read requires publication: %s', async (isPublished) => {
    vi.spyOn(service, 'findByIdPopulated').mockResolvedValue({ user: { id: 'other' }, isPublished });
    const next = vi.fn();
    const res = { json: vi.fn() };
    await getExperimentById({ params: { id: 'activity' }, auth: { payload: { id: 'owner' } } }, res, next);
    if (isPublished) expect(res.json).toHaveBeenCalled();
    else expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
  test('foreign published activity remains uneditable', async () => {
    vi.spyOn(service, 'findById').mockResolvedValue({ user: { id: 'other' }, isPublished: true });
    await expect(service.checkEditable('activity', 'owner')).rejects.toMatchObject({ statusCode: 403 });
  });
});
