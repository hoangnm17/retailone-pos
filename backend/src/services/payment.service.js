const {randomUUID} = require('node:crypto');
const {PAYMENT_METHODS} = require('../constants/pos.constants');
const {ensure, AppError} = require('../utils/errors');
const {decimal, roundMoney} = require('../utils/validation');
class PaymentService {
  constructor(repos, invoiceService, inventory, sse, config, clock = () => new Date()) {Object.assign(this, {repos, invoiceService, inventory, sse, config, clock});}
  async pay(invoiceId, body) {
    const method = body.paymentMethod;
    ensure(PAYMENT_METHODS.includes(method), 400, 'Phương thức thanh toán không hợp lệ');
    await this.invoiceService.expire(invoiceId);
    const result = await this.repos.transaction(async tx => {
      const invoice = await this.invoiceService.requireInvoice(invoiceId, tx);
      const previous = await this.repos.payments.find(invoiceId, tx);
      if (invoice.status === 'PAID' && previous?.status === 'SUCCESS') {
        ensure(previous.paymentMethod === method, 409, 'Hóa đơn đã được thanh toán bằng phương thức khác');
        return this.repos.invoices.detail(invoiceId, tx);
      }
      ensure(invoice.status === 'UNPAID', 409, 'Hóa đơn không thể thanh toán');
      if (previous?.status === 'PENDING') {
        ensure(method === 'BANK_TRANSFER', 409, 'Đang chờ chuyển khoản, không thể đổi phương thức');
        return this.repos.invoices.detail(invoiceId, tx);
      }
      const items = await this.repos.invoices.items(invoiceId, tx);
      ensure(items.length > 0, 400, 'Hóa đơn chưa có sản phẩm');
      // Read-only catalog check blocks products stopped after being added to the cart.
      for (const item of items) ensure((await this.repos.catalog.variant(item.variantId, tx))?.status === 'Selling', 409, `Sản phẩm đã ngừng bán: ${item.productName}`);
      const receivedAmount = method === 'CASH' ? decimal(body.receivedAmount, 'Tiền khách đưa') : null;
      if (method === 'CASH') ensure(receivedAmount >= invoice.finalAmount, 400, 'Tiền khách đưa chưa đủ');
      const allocations = await this.inventory.allocate(items, tx);
      await this.repos.invoices.replaceItems(invoiceId, allocations, tx);
      const createdAt = this.clock().toISOString();
      await this.repos.payments.save(invoiceId, {paymentMethod: method, amount: invoice.finalAmount, receivedAmount, status: method === 'CASH' ? 'SUCCESS' : 'PENDING', createdAt}, tx);
      if (method === 'CASH') {
        await this.repos.invoices.update(invoiceId, {status: 'PAID'}, tx);
      } else {
        await this.repos.payments.saveTransaction(invoiceId, {sepayId: null, transactionContent: `POS${randomUUID().replaceAll('-', '').toUpperCase()}`, amountIn: null, bankAccountNumber: 'MOCK-ACCOUNT', qrUrl: null, expiresAt: new Date(this.clock().getTime() + this.config.paymentTtlSeconds * 1000).toISOString(), status: 'PENDING', createdAt, confirmAt: null}, tx);
      }
      return this.repos.invoices.detail(invoiceId, tx);
    });
    if (result.status === 'PAID') this.sse.publish(invoiceId, 'PAYMENT_SUCCESS', {invoiceId, invoice: result});
    return result;
  }
  async confirm(body) {
    for (const field of ['transactionId', 'reference', 'accountNumber']) ensure(typeof body[field] === 'string' && body[field].length > 0 && body[field].length <= 50, 400, `${field} không hợp lệ`);
    const amount = decimal(body.amount, 'Số tiền chuyển khoản');
    ensure(body.type === 'credit', 400, 'Chỉ nhận giao dịch tiền vào');
    const result = await this.repos.transaction(async tx => {
      const gateway = await this.repos.payments.findGatewayReference(body.reference, tx);
      ensure(gateway, 404, 'Không tìm thấy nội dung chuyển khoản');
      const invoice = await this.invoiceService.requireInvoice(gateway.invoiceId, tx);
      const payment = await this.repos.payments.find(invoice.id, tx);
      ensure(body.accountNumber === gateway.bankAccountNumber && roundMoney(amount) === payment?.amount, 400, 'Sai tài khoản nhận hoặc số tiền');
      const duplicate = await this.repos.payments.findGatewayId(body.transactionId, tx);
      ensure(!duplicate || duplicate.invoiceId === invoice.id, 409, 'Mã giao dịch đã được dùng cho hóa đơn khác');
      if (gateway.status === 'SUCCESS') {
        ensure(gateway.sepayId === body.transactionId, 409, 'Hóa đơn đã nhận giao dịch khác');
        return this.repos.invoices.detail(invoice.id, tx);
      }
      ensure(invoice.status === 'UNPAID' && payment?.status === 'PENDING' && gateway.status === 'PENDING', 409, 'Giao dịch không còn chờ xác nhận');
      if (new Date(gateway.expiresAt) <= this.clock()) {
        await this.invoiceService.releasePending(invoice.id, tx);
        return {expired: true, invoiceId: invoice.id};
      }
      await this.repos.payments.saveTransaction(invoice.id, {sepayId: body.transactionId, amountIn: amount, status: 'SUCCESS', confirmAt: this.clock().toISOString()}, tx);
      await this.repos.payments.save(invoice.id, {status: 'SUCCESS'}, tx);
      await this.repos.invoices.update(invoice.id, {status: 'PAID'}, tx);
      return this.repos.invoices.detail(invoice.id, tx);
    });
    if (result.expired) {
      this.sse.publish(result.invoiceId, 'PAYMENT_EXPIRED', {invoiceId: result.invoiceId});
      throw new AppError(409, 'Yêu cầu chuyển khoản đã hết hạn');
    }
    this.sse.publish(result.id, 'PAYMENT_SUCCESS', {invoiceId: result.id, invoice: result});
    return result;
  }
  async mockConfirm(invoiceId) {
    const invoice = await this.invoiceService.detail(invoiceId);
    ensure(invoice.payment?.paymentMethod === 'BANK_TRANSFER' && invoice.transaction, 409, 'Chưa tạo yêu cầu chuyển khoản');
    return this.confirm({transactionId: invoice.transaction.sepayId || `MOCK-${randomUUID()}`, reference: invoice.transaction.transactionContent, accountNumber: 'MOCK-ACCOUNT', amount: invoice.payment.amount, type: 'credit'});
  }
}
module.exports = {PaymentService};
