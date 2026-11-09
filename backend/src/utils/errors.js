class AppError extends Error {
  constructor(statusCode, message, code = 'BUSINESS_ERROR') {
    super(message); this.statusCode = statusCode; this.code = code;
  }
}
const ensure = (condition, status, message, code) => {if (!condition) throw new AppError(status, message, code);};
module.exports = {AppError, ensure};
