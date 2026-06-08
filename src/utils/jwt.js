import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  const toSign = {
    id: user.id,
    email: user.email,
    role: user.role,
  }
  return jwt.sign(toSign, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const decodeToken = (token) => {
  return jwt.decode(token);
};
