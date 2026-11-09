const sql = require('mssql');
// MSSQL connection, transactions and parameterized model persistence.
class MssqlDatabase {
  constructor(config) {this.pool = new sql.ConnectionPool(config);}
  async connect() {
    await this.pool.connect();
    const result = await this.pool.request().query("SELECT COL_LENGTH('dbo.Invoices', 'taxAmount') AS taxColumn, COL_LENGTH('dbo.Invoices', 'taxRate') AS rateColumn");
    if (!result.recordset[0].taxColumn || !result.recordset[0].rateColumn) {await this.pool.close(); throw new Error('Run database/001-pos-tax.sql first');}
    return this;
  }
  async transaction(work) {
    const tx = new sql.Transaction(this.pool); let rolledBack = false;
    tx.on('rollback', () => {rolledBack = true;});
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      // All writes by this small POS serialize across server processes, including callbacks.
      await new sql.Request(tx).query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource=N'RetailOnePOS:checkout', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=15000;
        IF @result < 0 THROW 50001, 'POS transaction lock timed out', 1;`);
      const result = await work(tx); await tx.commit(); return result;
    } catch (error) {if (!rolledBack) await tx.rollback().catch(() => {}); throw error;}
  }
  async read(work) {
    const tx = new sql.Transaction(this.pool); await tx.begin(sql.ISOLATION_LEVEL.REPEATABLE_READ);
    try {
      // Readers take the same resource before table locks, avoiding a read/write lock inversion.
      await new sql.Request(tx).query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource=N'RetailOnePOS:checkout', @LockMode='Shared', @LockOwner='Transaction', @LockTimeout=15000;
        IF @result < 0 THROW 50001, 'POS read lock timed out', 1;`);
      const result = await work(tx); await tx.commit(); return result;
    }
    catch (error) {await tx.rollback().catch(() => {}); throw error;}
  }
  request(tx) {return tx ? new sql.Request(tx) : this.pool.request();}
  type(type) {
    return ({int: sql.Int, bigint: sql.BigInt, text: sql.NVarChar(sql.MAX), bit: sql.Bit, money: sql.Decimal(15, 2), qty: sql.Decimal(15, 3), rate: sql.Decimal(5, 2), date: sql.Date, datetime: sql.DateTime2})[type];
  }
  bind(request, def, key, value, parameter) {
    const type = key === (def.key || 'id') ? (def.key ? 'int' : 'bigint') : def.fields[key];
    if (!type) throw new Error(`Unknown model column: ${key}`);
    request.input(parameter, this.type(type), type === 'date' || type === 'datetime' ? (value ? new Date(value) : null) : value);
  }
  where(request, def, where) {
    return Object.entries(where).map(([key, value], i) => {
      this.bind(request, def, key, value, `w${i}`);
      return `[${key}] ${value === null ? 'IS NULL' : `= @w${i}`}`;
    }).join(' AND ') || '1=1';
  }
  normalize(rows) {
    return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => {
      if (value instanceof Date) return [key, value.toISOString()];
      if ((key === 'id' || key.endsWith('Id')) && value !== null) {
        const n = Number(value); if (!Number.isSafeInteger(n)) throw new Error('ID exceeds safe range'); return [key, n];
      }
      return [key, value];
    })));
  }
  async find(def, where = {}, tx) {
    const request = this.request(tx); const filter = this.where(request, def, where);
    return this.normalize((await request.query(`SELECT * FROM [dbo].[${def.table}] WHERE ${filter}`)).recordset);
  }
  async create(def, data, tx) {
    if (!tx) throw new Error('Write requires transaction');
    const request = this.request(tx); const entries = Object.entries(data);
    entries.forEach(([key, value], i) => this.bind(request, def, key, value, `v${i}`));
    return this.normalize((await request.query(`INSERT INTO [dbo].[${def.table}] (${entries.map(([key]) => `[${key}]`).join(',')}) OUTPUT INSERTED.* VALUES (${entries.map((_, i) => `@v${i}`).join(',')})`)).recordset)[0];
  }
  async update(def, key, data, tx) {
    if (!tx) throw new Error('Write requires transaction');
    const request = this.request(tx); const entries = Object.entries(data);
    entries.forEach(([field, value], i) => this.bind(request, def, field, value, `v${i}`));
    this.bind(request, def, def.key || 'id', key, 'key');
    return this.normalize((await request.query(`UPDATE [dbo].[${def.table}] SET ${entries.map(([field], i) => `[${field}]=@v${i}`).join(',')} OUTPUT INSERTED.* WHERE [${def.key || 'id'}]=@key`)).recordset)[0];
  }
  async deleteWhere(def, where, tx) {
    if (!tx || !Object.keys(where).length) throw new Error('Scoped transaction required');
    const request = this.request(tx); const filter = this.where(request, def, where);
    await request.query(`DELETE FROM [dbo].[${def.table}] WHERE ${filter}`);
  }
  async close() {await this.pool.close();}
}
module.exports = {MssqlDatabase};
