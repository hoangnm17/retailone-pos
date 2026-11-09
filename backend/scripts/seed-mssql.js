const sql = require('mssql');
const {getConfig} = require('../src/config/env');
const {MssqlDatabase} = require('../src/config/mssql.database');
const {createModels} = require('../src/models');
const {createSeed} = require('../src/mocks/seed');

async function main() {
  const config = getConfig();
  if (config.dataSource !== 'mssql') throw new Error('Set DATA_SOURCE=mssql to explicitly seed the development database');
  const db = await new MssqlDatabase(config.sql).connect();
  const models = createModels(db); const seed = createSeed();
  try {
    const info = await db.transaction(async tx => {
      const identity = await new sql.Request(tx).query(`
        DECLARE @roleId INT, @userId INT;
        SELECT @roleId=id FROM dbo.Roles WHERE name=N'POS Mock';
        IF @roleId IS NULL BEGIN INSERT dbo.Roles(name,description) VALUES(N'POS Mock',N'Local POS demo only'); SET @roleId=SCOPE_IDENTITY(); END;
        SELECT @userId=id FROM dbo.Users WHERE username='pos.mock.local';
        IF @userId IS NULL BEGIN INSERT dbo.Users(roleId,username,passwordHash,isActive) VALUES(@roleId,'pos.mock.local','MOCK-NO-LOGIN','locked'); SET @userId=SCOPE_IDENTITY(); END;
        SELECT @userId AS userId;`);
      const userId = identity.recordset[0].userId;
      let staff = await models.Staff.findOne({userId}, tx);
      if (!staff) staff = await models.Staff.create({userId, fullName: 'Thu ngân POS Mock', phoneNumber: '0990000999', employmentStatus: 'working'}, tx);
      let counter = await models.Counter.findOne({counterCode: 'POS-MOCK'}, tx);
      if (!counter) counter = await models.Counter.create({counterCode: 'POS-MOCK', counterName: 'Quầy POS Mock', status: 'ACTIVE'}, tx);
      const categoryMap = new Map(); const productMap = new Map(); const variantMap = new Map();
      for (const category of seed.Categories) {
        const name = `MOCK · ${category.name}`;
        const row = await models.Category.findOne({name}, tx) || await models.Category.create({name}, tx);
        categoryMap.set(category.id, row.id);
      }
      for (const source of seed.Products) {
        const {id, emoji, ...data} = source;
        const row = await models.Product.findOne({code: data.code}, tx) || await models.Product.create({...data, categoryId: categoryMap.get(data.categoryId)}, tx);
        productMap.set(id, row.id);
      }
      for (const source of seed.ProductVariants) {
        const {id, ...data} = source;
        let row = await models.ProductVariant.findOne({barcode: data.barcode}, tx);
        if (row && row.productId !== productMap.get(data.productId)) throw new Error('Mock barcode conflicts with existing product; rolled back');
        if (!row) row = await models.ProductVariant.create({...data, productId: productMap.get(data.productId)}, tx);
        variantMap.set(id, row.id);
      }
      for (const source of seed.Batches) {
        const variantId = variantMap.get(source.variantId);
        const existing = await models.Batch.findOne({variantId, batchCode: source.batchCode}, tx);
        if (existing) continue; // Never restock a batch already sold by this demo.
        const {id, ...data} = source;
        await models.Batch.create({...data, variantId}, tx);
        const stock = await models.InventoryStock.findOne({variantId}, tx);
        if (stock) await models.InventoryStock.update(variantId, {quantityOnHand: stock.quantityOnHand + source.quantity}, tx);
        else await models.InventoryStock.create({variantId, quantityOnHand: source.quantity, minThreshold: 5}, tx);
      }
      for (const source of seed.Customers) {
        const {id, ...data} = source;
        if (!(await models.Customer.findOne({phone: data.phone}, tx))) await models.Customer.create(data, tx);
      }
      return {staffId: staff.id, counterId: counter.id};
    });
    console.log(`Development mock catalog seeded. Set POS_STAFF_ID=${info.staffId} and POS_COUNTER_ID=${info.counterId} in backend/.env`);
  } finally {await db.close();}
}
main().catch(error => {console.error('Seed failed:', error.code || error.message); process.exitCode = 1;});
