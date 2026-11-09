const {ensure} = require('./errors');
function id(value, name = 'id') {
  ensure((typeof value === 'string' && /^\d+$/.test(value)) || typeof value === 'number', 400, `${name} không hợp lệ`);
  const n = Number(value);
  ensure(Number.isSafeInteger(n) && n > 0, 400, `${name} không hợp lệ`); return n;
}
function decimal(value, name, scale = 2, max = 1e10) {
  ensure(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max, 400, `${name} không hợp lệ`);
  ensure(Math.abs(value * 10 ** scale - Math.round(value * 10 ** scale)) < 0.0001, 400, `${name} chỉ được có ${scale} chữ số thập phân`);
  return value;
}
const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;
const roundQty = value => Math.round(value * 1000) / 1000;
module.exports = {id, decimal, roundMoney, roundQty};
