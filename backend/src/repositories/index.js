const {CatalogRepository} = require('./catalog.repository');
const {InvoiceRepository} = require('./invoice.repository');
const {PaymentRepository} = require('./payment.repository');
const {InventoryRepository} = require('./inventory.repository');
function createRepositories(models, database) {
  return {catalog: new CatalogRepository(models), invoices: new InvoiceRepository(models), payments: new PaymentRepository(models), inventory: new InventoryRepository(models), transaction: work => database.transaction(work), read: work => database.read(work)};
}
module.exports = {createRepositories};
