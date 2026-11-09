const {ensure} = require('../utils/errors');
const {roundQty, roundMoney} = require('../utils/validation');
const {isSellableBatch} = require('./catalog.service');
class InventoryService {
  constructor(repos, clock) {this.repos = repos; this.clock = clock;}
  async allocate(items, tx) {
    const result = [];
    for (const item of [...items].sort((a, b) => a.variantId - b.variantId)) {
      const stock = await this.repos.inventory.stock(item.variantId, tx);
      const batches = (await this.repos.inventory.batches(item.variantId, tx)).filter(b => isSellableBatch(b, this.clock()))
        .sort((a, b) => (a.expirationDate || '9999').localeCompare(b.expirationDate || '9999') || a.id - b.id);
      ensure(stock && stock.quantityOnHand >= item.quantity && roundQty(batches.reduce((s, b) => s + b.quantity, 0)) >= item.quantity, 409, `Không đủ tồn kho: ${item.productName}`, 'OUT_OF_STOCK');
      let remaining = item.quantity; let allocatedTotal = 0;
      for (const batch of batches) {
        if (!remaining) break;
        const quantity = Math.min(remaining, batch.quantity); remaining = roundQty(remaining - quantity);
        const factor = item.baseQuantity / item.quantity;
        // Round cumulative quantities to avoid drift/negative remainders across small fragments.
        const cumulativeTotal = remaining ? roundMoney(roundQty(item.quantity - remaining) * item.unitPrice) : item.lineTotal;
        const lineTotal = roundMoney(cumulativeTotal - allocatedTotal);
        allocatedTotal = roundMoney(allocatedTotal + lineTotal);
        result.push({...item, batchId: batch.id, quantity, baseQuantity: roundQty(quantity * factor), lineTotal});
        await this.repos.inventory.updateBatch(batch.id, roundQty(batch.quantity - quantity), tx);
      }
      await this.repos.inventory.updateStock(item.variantId, roundQty(stock.quantityOnHand - item.quantity), tx);
    }
    return result;
  }
  async release(items, tx) {
    for (const item of items) {
      if (!item.batchId) continue;
      const batch = (await this.repos.inventory.batches(item.variantId, tx)).find(b => b.id === item.batchId);
      const stock = await this.repos.inventory.stock(item.variantId, tx);
      ensure(batch && stock, 409, 'Không tìm thấy lô hàng đã giữ chỗ');
      await this.repos.inventory.updateBatch(batch.id, roundQty(batch.quantity + item.quantity), tx);
      await this.repos.inventory.updateStock(item.variantId, roundQty(stock.quantityOnHand + item.quantity), tx);
    }
  }
}
module.exports = {InventoryService};
