class InventoryRepository {
  constructor(models) {this.models = models;}
  batches(variantId, tx) {return this.models.Batch.find({variantId}, tx);}
  stock(variantId, tx) {return this.models.InventoryStock.findOne({variantId}, tx);}
  updateStock(variantId, quantityOnHand, tx) {return this.models.InventoryStock.update(variantId, {quantityOnHand}, tx);}
  updateBatch(id, quantity, tx) {return this.models.Batch.update(id, {quantity, updatedAt: new Date().toISOString()}, tx);}
}
module.exports = {InventoryRepository};
