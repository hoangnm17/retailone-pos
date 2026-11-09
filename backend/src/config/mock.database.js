// In-memory database adapter configured by app.js for local mock data.
class MockDatabase {
  constructor(seed) {this.state = structuredClone(seed); this.queue = Promise.resolve();}
  async transaction(work) {
    const preceding = this.queue;
    let release;
    this.queue = new Promise(resolve => {release = resolve;});
    await preceding;
    const tx = structuredClone(this.state);
    try {const result = await work(tx); this.state = tx; return result;} finally {release();}
  }
  async read(work) {await this.queue; return work(this.state);}
  rows(def, tx) {return (tx || this.state)[def.table] ||= [];}
  async find(def, where, tx) {
    return structuredClone(this.rows(def, tx).filter(row => Object.entries(where).every(([key, value]) => row[key] === value)));
  }
  async create(def, data, tx) {
    if (!tx) throw new Error('Write requires transaction');
    const rows = this.rows(def, tx); const key = def.key || 'id';
    const counters = tx._sequences ||= {};
    const next = Math.max(counters[def.table] || 0, ...rows.map(row => Number(row[key]) || 0)) + 1;
    const row = {...data, [key]: data[key] ?? next};
    counters[def.table] = Math.max(next, row[key]); rows.push(row); return structuredClone(row);
  }
  async update(def, key, data, tx) {
    if (!tx) throw new Error('Write requires transaction');
    const row = this.rows(def, tx).find(row => row[def.key || 'id'] === key);
    if (!row) throw new Error('Missing row'); Object.assign(row, data); return structuredClone(row);
  }
  async deleteWhere(def, where, tx) {
    if (!tx || !Object.keys(where).length) throw new Error('Scoped transaction required');
    tx[def.table] = this.rows(def, tx).filter(row => !Object.entries(where).every(([key, value]) => row[key] === value));
  }
  async close() {}
}
module.exports = {MockDatabase};
