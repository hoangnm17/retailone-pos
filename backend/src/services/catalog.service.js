const {ensure} = require('../utils/errors');
const {id, roundQty} = require('../utils/validation');
// Business dates follow the store timezone, independent of OS timezone.
const businessDate = now => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
const isSellableBatch = (batch, now) => batch.status === 'ACTIVE' && batch.quantity > 0 && (!batch.expirationDate || batch.expirationDate.slice(0, 10) >= businessDate(now));
class CatalogService {
  constructor(repos, config, clock = () => new Date()) {this.repos = repos; this.config = config; this.clock = clock;}
  async context() {
    return this.repos.read(async tx => ({...await this.repos.catalog.lookups(tx), staffId: this.config.staffId, counterId: this.config.counterId, dataSource: this.config.dataSource, paymentGateway: 'mock'}));
  }
  async list(query = {}) {
    const search = String(query.search || '').trim().toLocaleLowerCase('vi');
    ensure(search.length <= 100, 400, 'Từ khóa tối đa 100 ký tự');
    const categoryId = query.categoryId ? id(query.categoryId, 'categoryId') : null;
    return this.repos.read(async tx => (await this.repos.catalog.variants(tx))
      .filter(v => v.status === 'Selling' && (!categoryId || v.categoryId === categoryId) && [v.name, v.code, v.barcode].some(value => String(value || '').toLocaleLowerCase('vi').includes(search)))
      .map(({batches, ...v}) => ({...v, availableQuantity: roundQty(Math.min(v.quantityOnHand, batches.filter(b => isSellableBatch(b, this.clock())).reduce((sum, b) => sum + b.quantity, 0)))})));
  }
}
module.exports = {CatalogService, businessDate, isSellableBatch};
