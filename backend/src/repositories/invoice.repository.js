class InvoiceRepository {
  constructor(models) {this.models = models;}
  find(id, tx) {return this.models.Invoice.findOne({id}, tx);}
  list(tx) {return this.models.Invoice.find({}, tx);}
  create(data, tx) {return this.models.Invoice.create(data, tx);}
  update(id, data, tx) {return this.models.Invoice.update(id, data, tx);}
  items(invoiceId, tx) {return this.models.InvoiceItem.find({invoiceId}, tx);}
  async replaceItems(invoiceId, items, tx) {
    await this.models.InvoiceItem.deleteWhere({invoiceId}, tx);
    for (const item of items) {const {id, ...data} = item; await this.models.InvoiceItem.create({...data, invoiceId}, tx);}
  }
  async detail(id, tx) {
    const invoice = await this.find(id, tx); if (!invoice) return null;
    const staff = await this.models.Staff.findOne({id: invoice.staffId}, tx);
    const counter = await this.models.Counter.findOne({id: invoice.counterId}, tx);
    const customer = invoice.customerId ? await this.models.Customer.findOne({id: invoice.customerId}, tx) : null;
    const payment = await this.models.Payment.findOne({invoiceId: id}, tx);
    const transaction = await this.models.SepayTransaction.findOne({invoiceId: id}, tx);
    return {...invoice, staffName: staff?.fullName, counterName: counter?.counterName, customer,
      items: await this.items(id, tx), payment: payment ? {...payment, changeAmount: payment.paymentMethod === 'CASH' && payment.receivedAmount != null ? Math.round((payment.receivedAmount - payment.amount) * 100) / 100 : null} : null, transaction};
  }
}
module.exports = {InvoiceRepository};
