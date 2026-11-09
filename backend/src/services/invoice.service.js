const {randomUUID} = require('node:crypto');
const {INVOICE_STATUSES, PAYMENT_STATUSES} = require('../constants/pos.constants');
const {ensure} = require('../utils/errors');
const {id, decimal, roundMoney, roundQty} = require('../utils/validation');
const {isSellableBatch} = require('./catalog.service');

function mergeDraftItems(items) {
  const merged = new Map();
  for (const item of items) {
    const key = `${item.variantId}:${item.unitPrice}`;
    const previous = merged.get(key);
    merged.set(key, previous ? {...previous, quantity: roundQty(previous.quantity + item.quantity), baseQuantity: roundQty(previous.baseQuantity + item.baseQuantity), lineTotal: roundMoney(previous.lineTotal + item.lineTotal)} : {...item, batchId: null});
  }
  return [...merged.values()];
}
class InvoiceService {
  constructor(repos, config, inventory, sse, clock = () => new Date()) {Object.assign(this, {repos, config, inventory, sse, clock});}
  async requireInvoice(invoiceId, tx) {
    const invoice = await this.repos.invoices.find(invoiceId, tx);
    ensure(invoice, 404, 'Không tìm thấy hóa đơn', 'INVOICE_NOT_FOUND'); return invoice;
  }
  async editable(invoiceId, tx) {
    const invoice = await this.requireInvoice(invoiceId, tx);
    ensure(invoice.status === 'UNPAID', 409, 'Chỉ được sửa hóa đơn chưa thanh toán');
    const payment = await this.repos.payments.find(invoiceId, tx);
    ensure(payment?.status !== 'PENDING', 409, 'Hóa đơn đang chờ chuyển khoản. Hủy hóa đơn hoặc chờ hết hạn để sửa.');
    return invoice;
  }
  async create(body = {}) {
    const customerId = body.customerId == null ? null : id(body.customerId, 'customerId');
    return this.repos.transaction(async tx => {
      const staff = await this.repos.catalog.staff(this.config.staffId, tx);
      const counter = await this.repos.catalog.counter(this.config.counterId, tx);
      ensure(staff?.employmentStatus === 'working' && counter?.status === 'ACTIVE', 409, 'Thu ngân hoặc quầy cấu hình không hoạt động');
      if (customerId) ensure((await this.repos.catalog.customer(customerId, tx))?.status === 'Active', 400, 'Khách hàng không hoạt động');
      const invoice = await this.repos.invoices.create({invoiceCode: `HD-${randomUUID().replaceAll('-', '').toUpperCase()}`, staffId: staff.id, counterId: counter.id, scheduleId: null, customerId, totalAmount: 0, promotionDiscount: 0, voucherDiscount: 0, pointDiscount: 0, usedPoints: 0, finalAmount: 0, taxRate: 0, taxAmount: 0, status: 'UNPAID', createdAt: this.clock().toISOString()}, tx);
      return this.repos.invoices.detail(invoice.id, tx);
    });
  }
  async recalculate(invoice, items, tx, adjustments = {}) {
    const totalAmount = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
    decimal(totalAmount, 'Tổng tiền', 2, 1e10);
    const discount = Object.hasOwn(adjustments, 'discountAmount') ? adjustments.discountAmount : Number(invoice.promotionDiscount || 0);
    const taxRate = Object.hasOwn(adjustments, 'taxRate') ? adjustments.taxRate : Number(invoice.taxRate || 0);
    decimal(discount, 'Giảm giá'); decimal(taxRate, 'Thuế suất', 2, 100);
    ensure(discount <= roundMoney(totalAmount * 0.5), 400, 'Giảm giá tối đa 50% tổng tiền hàng');
    const taxAmount = roundMoney((totalAmount - discount) * taxRate / 100);
    return this.repos.invoices.update(invoice.id, {totalAmount, promotionDiscount: discount, taxRate, taxAmount, finalAmount: roundMoney(totalAmount - discount + taxAmount)}, tx);
  }
  async mutateItems(invoiceId, body, replace = false) {
    id(invoiceId); ensure(body && typeof body === 'object', 400, 'Thiếu thông tin sản phẩm');
    await this.expire(invoiceId);
    return this.repos.transaction(async tx => {
      const invoice = await this.editable(invoiceId, tx);
      const variants = await this.repos.catalog.variants(tx);
      ensure(body.variantId != null || (typeof body.barcode === 'string' && body.barcode.trim().length <= 50 && body.barcode.trim()), 400, 'Nhập variantId hoặc barcode');
      const variant = body.variantId != null ? variants.find(v => v.variantId === id(body.variantId, 'variantId')) : variants.find(v => v.barcode === body.barcode.trim());
      ensure(variant && variant.status === 'Selling', 404, 'Không tìm thấy sản phẩm đang bán');
      const quantity = decimal(body.quantity ?? 1, 'Số lượng', 3, 1000000);
      ensure(replace || quantity > 0, 400, 'Số lượng phải lớn hơn 0');
      ensure((variant.unitType === 'WEIGHT' && variant.allowDecimalQuantity) || Number.isInteger(quantity), 400, 'Đơn vị này chỉ nhận số lượng nguyên');
      const items = await this.repos.invoices.items(invoiceId, tx);
      const old = items.find(item => item.variantId === variant.variantId);
      const nextQuantity = replace ? quantity : roundQty((old?.quantity || 0) + quantity);
      const available = roundQty(Math.min(variant.quantityOnHand, variant.batches.filter(b => isSellableBatch(b, this.clock())).reduce((sum, b) => sum + b.quantity, 0)));
      ensure(nextQuantity <= available, 409, `Chỉ còn ${available} ${variant.unitName}: ${variant.name}`, 'OUT_OF_STOCK');
      const unitPrice = old?.unitPrice ?? variant.salePrice;
      const next = items.filter(item => item.variantId !== variant.variantId);
      if (nextQuantity > 0) next.push({productId: variant.productId, variantId: variant.variantId, batchId: null, productName: variant.name, unitName: variant.unitName, unitPrice, quantity: nextQuantity, baseQuantity: roundQty(nextQuantity * variant.conversionFactor), lineTotal: roundMoney(nextQuantity * unitPrice)});
      await this.recalculate(invoice, next, tx);
      await this.repos.invoices.replaceItems(invoiceId, next, tx);
      return this.repos.invoices.detail(invoiceId, tx);
    });
  }
  async update(invoiceId, body) {
    await this.expire(invoiceId);
    return this.repos.transaction(async tx => {
      const invoice = await this.editable(invoiceId, tx);
      if (Object.hasOwn(body, 'customerId')) {
        const customerId = body.customerId == null ? null : id(body.customerId, 'customerId');
        if (customerId) ensure((await this.repos.catalog.customer(customerId, tx))?.status === 'Active', 400, 'Khách hàng không hoạt động');
        await this.repos.invoices.update(invoiceId, {customerId}, tx);
      }
      await this.recalculate(invoice, await this.repos.invoices.items(invoiceId, tx), tx, body);
      return this.repos.invoices.detail(invoiceId, tx);
    });
  }
  async releasePending(invoiceId, tx) {
    const items = await this.repos.invoices.items(invoiceId, tx);
    await this.inventory.release(items, tx);
    await this.repos.invoices.replaceItems(invoiceId, mergeDraftItems(items), tx);
    await this.repos.payments.save(invoiceId, {status: 'FAILED'}, tx);
    await this.repos.payments.saveTransaction(invoiceId, {status: 'FAILED'}, tx);
  }
  async expire(invoiceId) {
    const expired = await this.repos.transaction(async tx => {
      const transaction = await this.repos.payments.transaction(invoiceId, tx);
      if (transaction?.status !== 'PENDING' || new Date(transaction.expiresAt) > this.clock()) return false;
      await this.releasePending(invoiceId, tx); return true;
    });
    if (expired) this.sse.publish(invoiceId, 'PAYMENT_EXPIRED', {invoiceId});
    return expired;
  }
  async sweepExpired() {
    const pending = await this.repos.read(tx => this.repos.payments.pending(tx));
    for (const row of pending) if (new Date(row.expiresAt) <= this.clock()) await this.expire(row.invoiceId);
  }
  async detail(invoiceId) {
    id(invoiceId); await this.expire(invoiceId);
    const invoice = await this.repos.read(tx => this.repos.invoices.detail(invoiceId, tx));
    ensure(invoice, 404, 'Không tìm thấy hóa đơn'); return invoice;
  }
  async cancel(invoiceId) {
    const result = await this.repos.transaction(async tx => {
      const invoice = await this.requireInvoice(invoiceId, tx);
      if (invoice.status === 'CANCELLED') return this.repos.invoices.detail(invoiceId, tx);
      ensure(invoice.status === 'UNPAID', 409, 'Không thể hủy hóa đơn đã thanh toán');
      if ((await this.repos.payments.find(invoiceId, tx))?.status === 'PENDING') await this.releasePending(invoiceId, tx);
      await this.repos.invoices.update(invoiceId, {status: 'CANCELLED'}, tx);
      return this.repos.invoices.detail(invoiceId, tx);
    });
    this.sse.publish(invoiceId, 'INVOICE_CANCELLED', {invoiceId}); return result;
  }
  async receipt(invoiceId) {
    const invoice = await this.detail(invoiceId);
    ensure(invoice.status === 'PAID' && invoice.payment?.status === 'SUCCESS', 409, 'Chỉ in biên lai sau khi thanh toán thành công');
    return invoice;
  }
  async history(query = {}) {
    await this.sweepExpired();
    const page = query.page ? id(query.page, 'page') : 1;
    const pageSize = query.pageSize ? id(query.pageSize, 'pageSize') : 20;
    ensure(pageSize <= 100 && page <= 1000000, 400, 'Phân trang không hợp lệ');
    const staffId = query.staffId ? id(query.staffId, 'staffId') : null;
    const customerId = query.customerId ? id(query.customerId, 'customerId') : null;
    ensure(!query.status || INVOICE_STATUSES.includes(query.status), 400, 'Trạng thái hóa đơn không hợp lệ');
    ensure(!query.paymentStatus || [...PAYMENT_STATUSES, 'NONE'].includes(query.paymentStatus), 400, 'Trạng thái thanh toán không hợp lệ');
    const boundary = (value, end) => {
      if (!value) return null;
      const parsed = new Date(`${value}T00:00:00Z`);
      ensure(/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, 400, 'Ngày lọc không hợp lệ');
      return new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}+07:00`).getTime();
    };
    const from = boundary(query.from, false); const to = boundary(query.to, true);
    ensure(from === null || to === null || from <= to, 400, 'Ngày bắt đầu phải trước ngày kết thúc');
    const search = String(query.search || '').trim().toLocaleLowerCase('vi'); ensure(search.length <= 100, 400, 'Từ khóa tối đa 100 ký tự');
    return this.repos.read(async tx => {
      const invoices = (await this.repos.invoices.list(tx)).filter(row => (!query.status || row.status === query.status) && (!staffId || row.staffId === staffId) && (!customerId || row.customerId === customerId) && (from === null || Date.parse(row.createdAt) >= from) && (to === null || Date.parse(row.createdAt) <= to)).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
      const matching = [];
      for (const invoice of invoices) {
        const row = await this.repos.invoices.detail(invoice.id, tx);
        if (query.paymentStatus && (row.payment?.status || 'NONE') !== query.paymentStatus) continue;
        if (search && ![row.invoiceCode, row.staffName, row.customer?.name, row.customer?.phone].some(v => String(v || '').toLocaleLowerCase('vi').includes(search))) continue;
        const {items, transaction, ...summary} = row; matching.push(summary);
      }
      return {data: matching.slice((page - 1) * pageSize, page * pageSize), pagination: {page, pageSize, totalItems: matching.length, totalPages: Math.ceil(matching.length / pageSize)}};
    });
  }
}
module.exports = {InvoiceService, mergeDraftItems};
