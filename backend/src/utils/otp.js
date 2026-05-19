const crypto = require('crypto');

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RESEND_COOLDOWN_SECONDS = 30;

const generateOTP = () => String(crypto.randomInt(100000, 1000000));

const isResendAllowed = (lastSentAt) => {
  if (!lastSentAt) return true;
  const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
  return elapsed >= OTP_RESEND_COOLDOWN_SECONDS;
};

const buildOTPPayload = (code) => ({
  code,
  expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  attempts: 0,
  last_sent_at: new Date(),
});

const isOTPExpired = (expiresAt) => !expiresAt || new Date(expiresAt) < new Date();

const isMaxAttemptsReached = (attempts) => attempts >= OTP_MAX_ATTEMPTS;

module.exports = {
  generateOTP,
  isResendAllowed,
  buildOTPPayload,
  isOTPExpired,
  isMaxAttemptsReached,
  OTP_RESEND_COOLDOWN_SECONDS,
};
