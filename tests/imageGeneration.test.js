import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import axios from 'axios';
import ImageGeneration from '../src/services/v1/ImageGeneration.js';
import { generateLeiaAvatar } from '../src/controllers/v1/ImageController.js';

const originalPost = axios.post;

beforeEach(() => {
  axios.post = vi.fn().mockResolvedValue({ data: { ok: true } });
  process.env.RUNNER_URL = 'http://runner';
  process.env.RUNNER_KEY = 'runner-secret';
});

afterEach(() => {
  axios.post = originalPost;
});

describe('ImageGeneration BYOK payloads', () => {
  test('sends Gemini key ownership data when generating avatars', async () => {
    await ImageGeneration.generatePersonaAvatar(
      { name: 'Persona' },
      { apiKeyId: 'key1', apiKeyRequesterId: 'user1' }
    );

    expect(axios.post).toHaveBeenCalledWith(
      'http://runner/api/v1/avatars/personas/generate',
      {
        persona: { name: 'Persona' },
        apiKeyId: 'key1',
        apiKeyRequesterId: 'user1',
      },
      { headers: { Authorization: 'Bearer runner-secret' } }
    );
  });

  test('sends Gemini key ownership data when generating infographics', async () => {
    await ImageGeneration.generateInfographic(
      { metadata: { name: 'LEIA' } },
      true,
      { apiKeyId: 'key1', apiKeyRequesterId: 'user1' }
    );

    expect(axios.post).toHaveBeenCalledWith(
      'http://runner/api/v1/infographics/generate',
      {
        leia: { metadata: { name: 'LEIA' } },
        solution: true,
        apiKeyId: 'key1',
        apiKeyRequesterId: 'user1',
      },
      { headers: { Authorization: 'Bearer runner-secret' } }
    );
  });
});

describe('ImageController BYOK validation', () => {
  test('rejects image generation before loading resources when apiKeyId is missing', async () => {
    const req = {
      body: {},
      auth: { payload: { id: 'user1', role: 'advanced' } },
      params: { id: 'leia1' },
    };
    const res = {};
    const next = vi.fn();

    await generateLeiaAvatar(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({
      message: 'apiKeyId is required',
      statusCode: 400,
    });
    expect(axios.post).not.toHaveBeenCalled();
  });
});
