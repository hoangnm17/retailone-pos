function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.parse.failed' ? 400 : (error.statusCode || (error.status === 413 ? 413 : 500));
  if (status === 500) console.error('POS request failed:', error.code || error.name);
  res.status(status).json({success: false, code: error.code || 'REQUEST_ERROR', message: status >= 500 ? 'Lỗi hệ thống. Vui lòng thử lại.' : error.type === 'entity.parse.failed' ? 'JSON không hợp lệ' : error.message});
}
module.exports = {errorHandler};
