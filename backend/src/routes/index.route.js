const express = require('express');
const {createCatalogRoutes} = require('./catalog.route');
const {createInvoiceRoutes} = require('./invoice.route');
const {createPaymentRoutes} = require('./payment.route');

function createRoutes(controllers, config) {
  const router = express.Router();

  router.use(createCatalogRoutes(controllers.catalog));
  router.use('/invoices', createInvoiceRoutes(controllers.invoice));
  router.use(createPaymentRoutes(controllers.payment, config));

  return router;
}

module.exports = {createRoutes};
