/* Copyright by HoangNm - HE194566 * 9-11-2026*/

const express = require('express');
const http = require('node:http');
const {getConfig} = require('./config/env');
const {createSeed} = require('./mocks/seed');
const {MockDatabase} = require('./config/mock.database');
const {createModels} = require('./models');
const {createRepositories} = require('./repositories');
const {SseService} = require('./services/sse.service');
const {CatalogService} = require('./services/catalog.service');
const {InventoryService} = require('./services/inventory.service');
const {InvoiceService} = require('./services/invoice.service');
const {PaymentService} = require('./services/payment.service');
const {CatalogController} = require('./controllers/catalog.controller');
const {InvoiceController} = require('./controllers/invoice.controller');
const {PaymentController} = require('./controllers/payment.controller');
const {createRoutes} = require('./routes/index.route');
const {errorHandler} = require('./middlewares/error.middleware');
const {corsMiddleware} = require('./middlewares/cors.middleware');

async function createApp({config = getConfig(), database, clock = () => new Date()} = {}) {
  if (!database) {
    if (config.dataSource === 'mssql') {
      const {MssqlDatabase} = require('./config/mssql.database');
      database = await new MssqlDatabase(config.sql).connect();
    } else database = new MockDatabase(createSeed(clock()));
  }
  const repos = createRepositories(createModels(database), database);
  const sse = new SseService();
  const inventory = new InventoryService(repos, clock);
  const invoices = new InvoiceService(repos, config, inventory, sse, clock);
  const payments = new PaymentService(repos, invoices, inventory, sse, config, clock);
  const catalog = new CatalogService(repos, config, clock);
  const app = express(); app.disable('x-powered-by');
  app.use(corsMiddleware(config.frontendOrigins));
  app.use(express.json({limit: '100kb'}));
  // Empty JSON bodies are normalized, allowing POST /invoices with no payload.
  app.use((req, res, next) => {req.body ||= {}; next();});
  app.get('/api/health', (req, res) => res.json({success: true, dataSource: config.dataSource, paymentGateway: 'mock'}));
  app.use('/api', createRoutes({catalog: new CatalogController(catalog), invoice: new InvoiceController(invoices, sse), payment: new PaymentController(payments)}, config));
  app.use('/api', (req, res) => res.status(404).json({success: false, message: 'API không tồn tại'}));
  app.use((req, res) => res.status(404).json({success: false, message: 'Backend chỉ cung cấp API tại /api'}));
  app.use(errorHandler);
  return {app, services: {invoices, payments, catalog}, database, sse, close: async () => {sse.close(); await database.close();}};
}

// Application entry point: configure storage, create Express and start the API server.
async function start({config = getConfig(), database, clock} = {}) {
  const runtime = await createApp({config, database, clock});
  const server = http.createServer(runtime.app);
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, config.host, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
  } catch (error) {
    await runtime.close();
    throw error;
  }

  const timer = setInterval(() => {
    runtime.services.invoices.sweepExpired().catch(() => console.error('Pending payment cleanup failed'));
  }, 30000);
  timer.unref();
  console.log(`RetailOne POS API: http://${config.host}:${server.address().port} (${config.dataSource}; gateway MOCK)`);

  let closing;
  const close = () => {
    if (!closing) closing = (async () => {
      clearInterval(timer);
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      runtime.sse.close();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      await runtime.close();
    })();
    return closing;
  };
  const stop = () => close().then(() => process.exit(0)).catch(() => {
    console.error('POS shutdown failed');
    process.exitCode = 1;
  });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return {...runtime, server, close};
}

if (require.main === module) {
  start().catch(error => {
    console.error('POS startup failed:', error.code || error.message?.replace(/password\s*[:=]\s*\S+/gi, 'password=[redacted]'));
    process.exitCode = 1;
  });
}

module.exports = {createApp, start};
