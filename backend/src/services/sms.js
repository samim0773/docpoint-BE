const axios = require('axios');
const logger = require('../config/logger');

const MSG91_BASE = 'https://control.msg91.com/api/v5';

/**
 * Core send helper — skips real call in development.
 * In production, calls MSG91 Flow API.
 */
const _send = async ({ templateId, mobile, variables }) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV SMS] → ${mobile} | template:${templateId} | vars:${JSON.stringify(variables)}`);
    return { success: true, dev: true };
  }

  try {
    const response = await axios.post(
      `${MSG91_BASE}/flow/`,
      {
        flow_id: templateId,
        sender: process.env.MSG91_SENDER_ID || 'DOCPNT',
        mobiles: `91${mobile}`,
        ...variables,
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
    return { success: true, data: response.data };
  } catch (err) {
    logger.error(`MSG91 send failed [${templateId}] → ${mobile}:`, err.message);
    throw new Error('SMS delivery failed');
  }
};

const sendOTP = (mobile, otp) =>
  _send({
    templateId: process.env.MSG91_OTP_TEMPLATE_ID,
    mobile,
    variables: { otp },
  });

const sendBookingConfirmation = (mobile, { doctorName, tokenNumber, date, eta }) =>
  _send({
    templateId: process.env.MSG91_BOOKING_TEMPLATE_ID,
    mobile,
    variables: { doctor_name: doctorName, token: tokenNumber, date, eta },
  });

const sendBookingCancellation = (mobile, { doctorName, date }) =>
  _send({
    templateId: process.env.MSG91_BOOKING_TEMPLATE_ID,
    mobile,
    variables: { doctor_name: doctorName, date, status: 'cancelled' },
  });

const sendQueueAlert = (mobile, { doctorName, position }) =>
  _send({
    templateId: process.env.MSG91_QUEUE_TEMPLATE_ID,
    mobile,
    variables: { doctor_name: doctorName, position },
  });

const sendDoctorApproval = (mobile, { doctorName, status, reason }) =>
  _send({
    templateId: process.env.MSG91_OTP_TEMPLATE_ID,
    mobile,
    variables: { name: doctorName, status, reason: reason || '' },
  });

module.exports = {
  sendOTP,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendQueueAlert,
  sendDoctorApproval,
};
