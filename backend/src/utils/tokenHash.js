const crypto = require('crypto');

/**
 * SHA-256 hash for refresh tokens.
 * bcrypt truncates at 72 chars; refresh JWTs are longer, so crypto is correct here.
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

module.exports = { hashToken };
