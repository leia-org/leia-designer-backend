import UserService from '../../services/v1/UserService.js';
import { createUserValidator, updateUserValidator, loginUserValidator } from '../../validators/v1/userValidator.js';
import { generateToken } from '../../utils/jwt.js';

// No authentication required
export const login = async (req, res, next) => {
  try {
    const value = await loginUserValidator.validateAsync(req.body, { abortEarly: false });

    const user = await UserService.login(value.email, value.password);
    const token = generateToken(user.toJSON());
    res.json({ token });
  } catch (err) {
    next(err);
  }
};

// Admin access managed by middleware in routes
export const createUser = async (req, res, next) => {
  try {
    const value = await createUserValidator.validateAsync(req.body, { abortEarly: false });

    const savedUser = await UserService.create(value);
    res.status(201).json(savedUser);
  } catch (err) {
    next(err);
  }
};

// Admin access managed by middleware in routes
export const getUserById = async (req, res, next) => {
  try {
    const user = await UserService.findById(req.params.id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Admin access managed by middleware in routes
export const getUsers = async (req, res, next) => {
  try {
    const users = await UserService.findAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// Custom authorization check
export const updateUser = async (req, res, next) => {
  try {
    const value = await updateUserValidator.validateAsync(req.body, { abortEarly: false });

    const id = req.params.id;

    if ((id !== req.auth?.payload?.id || value.role) && req.auth?.payload?.role !== 'admin') {
      const error = new Error('Unauthorized: Admin access required');
      error.statusCode = 403;
      throw error;
    }

    const updatedUser = await UserService.update(id, value);
    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const id = req.params.id;

    await UserService.delete(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const getUserByEmail = async (req, res, next) => {
  try {
    const user = await UserService.findByEmail(req.params.email);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};
