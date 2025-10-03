import UserRepository from '../../repositories/v1/UserRepository.js';

class UserService {
  async findAll() {
    return await UserRepository.findAll();
  }

  async findById(id) {
    return await UserRepository.findById(id);
  }

  async findByEmail(email) {
    return await UserRepository.findByEmail(email);
  }

  async existsByEmail(email) {
    return await UserRepository.existsByEmail(email);
  }

  async create(userData) {
    return await UserRepository.create(userData);
  }

  async update(id, userData) {
    return await UserRepository.update(id, userData);
  }

  async delete(id) {
    return await UserRepository.delete(id);
  }

  async login(email, password) {
    const user = await UserRepository.findByEmail(email);

    if (!user || !(await user.isCorrectPassword(password))) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    return user;
  }

  async updateProfile(id, email) {
    // Check if email is already taken by another user
    if (email) {
      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser && existingUser.id !== id) {
        const error = new Error('Email already in use');
        error.statusCode = 400;
        throw error;
      }
    }

    return await UserRepository.update(id, { email });
  }

  async changePassword(id, currentPassword, newPassword) {
    const user = await UserRepository.findById(id);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify current password
    const isCorrect = await user.isCorrectPassword(currentPassword);
    if (!isCorrect) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    // Update password
    return await UserRepository.update(id, { password: newPassword });
  }
}

export default new UserService();
