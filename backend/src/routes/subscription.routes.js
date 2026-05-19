const express = require('express');
const router = express.Router();

const { verifyUser } = require('../middleware/auth');
const validate = require('../validators/validate');
const { createOrderRules, confirmPaymentRules } = require('../validators/subscription.validators');
const {
  getPlans,
  createSubscriptionOrder,
  confirmSubscription,
  getSubscriptionStatus,
} = require('../controllers/subscription.controller');

router.get('/plans', getPlans);
router.post('/order', verifyUser, createOrderRules, validate, createSubscriptionOrder);
router.post('/confirm', verifyUser, confirmPaymentRules, validate, confirmSubscription);
router.get('/status', verifyUser, getSubscriptionStatus);

module.exports = router;
