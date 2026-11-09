class PaymentRepository {
  constructor(models) {this.models = models;}
  find(invoiceId, tx) {return this.models.Payment.findOne({invoiceId}, tx);}
  transaction(invoiceId, tx) {return this.models.SepayTransaction.findOne({invoiceId}, tx);}
  findGatewayReference(transactionContent, tx) {return this.models.SepayTransaction.findOne({transactionContent}, tx);}
  findGatewayId(sepayId, tx) {return this.models.SepayTransaction.findOne({sepayId}, tx);}
  pending(tx) {return this.models.SepayTransaction.find({status: 'PENDING'}, tx);}
  async save(invoiceId, data, tx) {
    const row = await this.find(invoiceId, tx);
    return row ? this.models.Payment.update(row.id, data, tx) : this.models.Payment.create({...data, invoiceId}, tx);
  }
  async saveTransaction(invoiceId, data, tx) {
    const row = await this.transaction(invoiceId, tx);
    return row ? this.models.SepayTransaction.update(row.id, data, tx) : this.models.SepayTransaction.create({...data, invoiceId}, tx);
  }
}
module.exports = {PaymentRepository};
