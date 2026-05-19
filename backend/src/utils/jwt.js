const jwt = require('jsonwebtoken');

const sign = (payload, secret, expiresIn) =>
  jwt.sign(payload, secret, { expiresIn });

const verify = (token, secret) => jwt.verify(token, secret);

const generateAccessToken = (userId) =>
  sign({ id: userId, role: 'user' }, process.env.JWT_ACCESS_SECRET, process.env.JWT_ACCESS_EXPIRES || '15m');

const generateRefreshToken = (userId) =>
  sign({ id: userId, role: 'user' }, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES || '30d');

const generateDoctorAccessToken = (doctorId) =>
  sign({ id: doctorId, role: 'doctor' }, process.env.JWT_DOCTOR_SECRET, process.env.JWT_ACCESS_EXPIRES || '15m');

const generateDoctorRefreshToken = (doctorId) =>
  sign({ id: doctorId, role: 'doctor' }, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES || '30d');

const generateAdminToken = (adminId) =>
  sign({ id: adminId, role: 'admin' }, process.env.JWT_ADMIN_SECRET, process.env.JWT_ADMIN_EXPIRES || '8h');

const verifyUserToken = (token) => verify(token, process.env.JWT_ACCESS_SECRET);
const verifyRefreshToken = (token) => verify(token, process.env.JWT_REFRESH_SECRET);
const verifyDoctorToken = (token) => verify(token, process.env.JWT_DOCTOR_SECRET);
const verifyAdminToken = (token) => verify(token, process.env.JWT_ADMIN_SECRET);

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateDoctorAccessToken,
  generateDoctorRefreshToken,
  generateAdminToken,
  verifyUserToken,
  verifyRefreshToken,
  verifyDoctorToken,
  verifyAdminToken,
  REFRESH_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
};
