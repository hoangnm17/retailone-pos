class CatalogRepository {
  constructor(models) {this.models = models;}
  async lookups(tx) {
    const m = this.models;
    // Sequential: node-mssql permits one active request per transaction connection.
    return {categories: await m.Category.find({}, tx), customers: await m.Customer.find({status: 'Active'}, tx), staff: await m.Staff.find({employmentStatus: 'working'}, tx), counters: await m.Counter.find({status: 'ACTIVE'}, tx)};
  }
  async variants(tx) {
    const products = await this.models.Product.find({}, tx);
    const variants = await this.models.ProductVariant.find({}, tx);
    const stocks = await this.models.InventoryStock.find({}, tx);
    const batches = await this.models.Batch.find({}, tx);
    return variants.map(variant => ({...products.find(p => p.id === variant.productId), ...variant, productId: variant.productId, variantId: variant.id,
      quantityOnHand: stocks.find(s => s.variantId === variant.id)?.quantityOnHand || 0,
      batches: batches.filter(b => b.variantId === variant.id)}));
  }
  async variant(id, tx) {return (await this.variants(tx)).find(v => v.variantId === id) || null;}
  customer(id, tx) {return this.models.Customer.findOne({id}, tx);}
  staff(id, tx) {return this.models.Staff.findOne({id}, tx);}
  counter(id, tx) {return this.models.Counter.findOne({id}, tx);}
}
module.exports = {CatalogRepository};
