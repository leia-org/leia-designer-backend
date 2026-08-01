import { beforeEach, describe, expect, test, vi } from 'vitest';
import axios from 'axios';
import { getUserProfileFromAuthService, populateUserInEntity } from '../src/utils/authClient.js';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn()
  }
}));

describe('Auth client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SERVICE_URL = 'https://auth.example.test';
    process.env.INTERN_TOKEN = 'internal-token';
  });

  test('returns an existing Auth profile', async () => {
    const profile = { id: 'user-1', email: 'user@example.test', role: 'instructor' };
    axios.get.mockResolvedValue({ data: profile });

    await expect(getUserProfileFromAuthService('user-1')).resolves.toEqual(profile);
    expect(axios.get).toHaveBeenCalledWith(
      'https://auth.example.test/api/v1/users/intern/user-1',
      { headers: { 'x-intern-token': 'internal-token' } }
    );
  });

  test('treats a missing Auth profile as an expected stale reference', async () => {
    const error = { message: 'Request failed with status code 404', response: { status: 404 } };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    axios.get.mockRejectedValue(error);
    axios.isAxiosError.mockReturnValue(true);

    await expect(getUserProfileFromAuthService('deleted-user')).resolves.toBeNull();
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test('keeps logging actual Auth service failures', async () => {
    const error = { message: 'Service unavailable', response: { status: 503 } };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    axios.get.mockRejectedValue(error);
    axios.isAxiosError.mockReturnValue(true);

    await expect(getUserProfileFromAuthService('user-1')).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      'Error fetching user user-1 from Auth Service:',
      'Service unavailable'
    );

    consoleError.mockRestore();
  });

  test('preserves the stored owner ID when its Auth profile no longer exists', async () => {
    axios.get.mockRejectedValue({ message: 'Not found', response: { status: 404 } });
    axios.isAxiosError.mockReturnValue(true);

    await expect(populateUserInEntity({ id: 'resource-1', user: 'deleted-user' })).resolves.toEqual({
      id: 'resource-1',
      user: 'deleted-user'
    });
  });
});
