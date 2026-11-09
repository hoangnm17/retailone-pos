const {timingSafeEqual} = require('node:crypto');
const {AppError} = require('../utils/errors');
function gatewayAuth(secret) {
  return (req, res, next) => {
    const actual = Buffer.from(req.get('x-webhook-secret') || ''); const expected = Buffer.from(secret);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return next(new AppError(401, 'Webhook không được xác thực'));
    next();
  };
}
module.exports = {gatewayAuth};
