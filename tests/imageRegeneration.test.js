import { afterEach, describe, expect, test, vi } from 'vitest';
import mongoose from 'mongoose';
import axios from 'axios';
import Leia from '../src/models/Leia.js';
import PersonaService from '../src/services/v1/PersonaService.js';
import ImageGeneration from '../src/services/v1/ImageGeneration.js';
import S3Service, { keyFromStoredImagePath } from '../src/services/v1/s3.js';
import { canModify, generateImageForTarget } from '../src/controllers/v1/ImageController.js';

afterEach(() => vi.restoreAllMocks());

describe('regenerated image persistence', () => {
  test('persists a cache version and synchronizes only the avatar in every referring LEIA', async () => {
    const id = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const entity = { _id: id, user: userId, spec: {}, metadata: {},
      set: vi.fn(), save: vi.fn(), toJSON: () => ({ kind: 'Persona', spec: {}, metadata: {} }) };
    entity.save.mockResolvedValue(entity);
    vi.spyOn(PersonaService, 'findById').mockResolvedValue(entity);
    vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    vi.spyOn(ImageGeneration, 'generatePersonaAvatar').mockResolvedValue({ avatar: 'data:image/webp;base64,AA==' });
    vi.spyOn(S3Service, 'saveAvatar').mockResolvedValue({ key: `images/personas/${id}/avatar/original.webp`, previousKey: `images/personas/${id}/avatar/original.webp` });
    const remove = vi.spyOn(S3Service, 'deleteObject');
    const synchronize = vi.spyOn(Leia, 'updateMany').mockResolvedValue({ modifiedCount: 2 });
    const result = await generateImageForTarget('personas', String(id), { userId: String(userId), role: 'advanced' }, { apiKeyId: 'key' });
    expect(result.avatar).toMatch(/original\.webp\?v=[\da-f-]+$/);
    expect(entity.set).toHaveBeenCalledWith('spec.avatar', result.avatar);
    expect(synchronize).toHaveBeenCalledWith({ 'spec.personaId': id }, { $set: { 'spec.persona.spec.avatar': result.avatar } });
    expect(remove).not.toHaveBeenCalled();
    expect(keyFromStoredImagePath(result.avatar)).toBe(result.key);
  });

  test('checks ownership for ObjectIds and embedded component snapshots', () => {
    const owner = new mongoose.Types.ObjectId();
    const context = { userId: String(owner), role: 'advanced' };
    expect(canModify({ user: owner }, context)).toBe(true);
    expect(canModify({ user: { id: String(owner) } }, context)).toBe(true);
    expect(canModify({ user: String(new mongoose.Types.ObjectId()) }, context)).toBe(false);
  });
});
