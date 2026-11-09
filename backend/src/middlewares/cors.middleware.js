const {AppError} = require('../utils/errors');
const {CORS_METHODS, CORS_HEADERS} = require('../constants/pos.constants');

function corsMiddleware(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  const methods = CORS_METHODS;
  const headers = CORS_HEADERS;

  return (req, res, next) => {
    res.vary('Origin');
    const origin = req.get('Origin');
    // CLI clients and gateway webhooks can call the API without a browser Origin.
    if (!origin) return next();
    if (!allowed.has(origin)) return next(new AppError(403, 'Origin frontend không được phép', 'CORS_ORIGIN_DENIED'));
    res.set('Access-Control-Allow-Origin', origin);

    if (req.method !== 'OPTIONS') return next();
    const requestedMethod = req.get('Access-Control-Request-Method');
    const requestedHeaders = (req.get('Access-Control-Request-Headers') || '').split(',').map(header => header.trim().toLowerCase()).filter(Boolean);
    if (!methods.includes(requestedMethod) || requestedHeaders.some(header => !headers.includes(header))) {
      return next(new AppError(403, 'CORS preflight không hợp lệ', 'CORS_PREFLIGHT_DENIED'));
    }
    res.set({
      'Access-Control-Allow-Methods': methods.join(', '),
      'Access-Control-Allow-Headers': headers.join(', '),
      'Access-Control-Max-Age': '600'
    });
    return res.sendStatus(204);
  };
}

module.exports = {corsMiddleware};
