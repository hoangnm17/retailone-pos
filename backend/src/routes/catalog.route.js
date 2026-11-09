const express = require('express');

function createCatalogRoutes(controller) {
  const router = express.Router();

  router.get('/context', controller.context);
  router.get('/products', controller.list);

  return router;
}

module.exports = {createCatalogRoutes};
