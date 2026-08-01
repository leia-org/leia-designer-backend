import jwt from 'jsonwebtoken';

const getVerificationOptions = () => ({
  ...(process.env.JWT_ISSUER ? { issuer: process.env.JWT_ISSUER } : {}),
  ...(process.env.JWT_AUDIENCE ? { audience: process.env.JWT_AUDIENCE } : {}),
});

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
  const payload = jwt.verify(token, process.env.JWT_SECRET, getVerificationOptions());
  if (payload.type && payload.type !== 'access') {
    throw new Error('Access token required');
  }
  return payload;
};

export const decodeToken = (token) => {
  return jwt.decode(token);
};
