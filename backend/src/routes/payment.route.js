const express = require('express');
const {gatewayAuth} = require('../middlewares/gateway.middleware');

function createPaymentRoutes(controller, config) {
  const router = express.Router();

  router.post('/invoices/:id/payments', controller.pay);
  // Both data sources use a MOCK gateway. This never initiates real money transfers.
  router.post('/invoices/:id/mock-bank-confirm', controller.mockConfirm);
  router.post('/payments/webhook', gatewayAuth(config.webhookSecret), controller.webhook);

  return router;
}

module.exports = {createPaymentRoutes};
