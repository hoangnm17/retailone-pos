const express = require('express');

function createInvoiceRoutes(controller) {
  const router = express.Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id/events', controller.events);
  router.get('/:id/receipt', controller.receipt);
  router.get('/:id', controller.detail);
  router.patch('/:id', controller.update);
  router.post('/:id/items', controller.addItem);
  router.patch('/:id/items/:variantId', controller.setQuantity);
  router.post('/:id/cancel', controller.cancel);

  return router;
}

module.exports = {createInvoiceRoutes};
