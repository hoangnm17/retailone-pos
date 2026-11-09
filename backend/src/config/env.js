const path = require('node:path');
const {DATA_SOURCES, DEFAULT_API_PORT, DEFAULT_FRONTEND_ORIGINS} = require('../constants/pos.constants');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function getConfig(env = process.env) {
  const dataSource = env.DATA_SOURCE || 'mock';
  if (!DATA_SOURCES.includes(dataSource)) throw new Error('DATA_SOURCE must be mock or mssql');
  const number = (name, fallback) => {
    const value = Number(env[name] || fallback);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${name}`);
    return value;
  };
  const frontendOrigins = (env.FRONTEND_ORIGINS || DEFAULT_FRONTEND_ORIGINS.join(',')).split(',').map(value => {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('FRONTEND_ORIGINS must contain HTTP(S) origins without paths');
    return url.origin;
  });
  return {
    dataSource, port: number('PORT', DEFAULT_API_PORT), host: env.HOST || '127.0.0.1',
    frontendOrigins: [...new Set(frontendOrigins)],
    staffId: number('POS_STAFF_ID', 1), counterId: number('POS_COUNTER_ID', 1),
    paymentTtlSeconds: number('PAYMENT_TTL_SECONDS', 900),
    webhookSecret: env.GATEWAY_WEBHOOK_SECRET || 'local-mock-webhook-secret',
    sql: {
      server: env.DB_SERVER || '127.0.0.1', port: number('DB_PORT', 1433),
      database: env.DB_NAME || 'RetailOnePOS', user: env.DB_USER, password: env.DB_PASSWORD,
      options: {encrypt: env.DB_ENCRYPT !== 'false', trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE === 'true', useUTC: true},
      pool: {max: 5, min: 0, idleTimeoutMillis: 30000}, requestTimeout: 30000
    }
  };
}
module.exports = {getConfig};
