function createSeed(now = new Date()) {
  const date = days => new Date(now.getTime() + days * 86400000).toISOString();
  const categories = ['Đồ uống', 'Sữa & dinh dưỡng', 'Bánh kẹo', 'Thực phẩm', 'Chăm sóc nhà cửa'];
  const entries = [
    ['COCA', 'Coca-Cola nguyên bản', 1, 'Lon', 10000, 64, '🥤'],
    ['PEPSI', 'Pepsi không calo', 1, 'Lon', 11000, 48, '🥤'],
    ['LAVIE', 'Nước khoáng La Vie 500ml', 1, 'Chai', 6000, 96, '💧'],
    ['TEA', 'Trà xanh không độ', 1, 'Chai', 12000, 35, '🍵'],
    ['VINAMILK', 'Sữa tươi Vinamilk 180ml', 2, 'Hộp', 8500, 80, '🥛'],
    ['TH', 'Sữa tươi TH true MILK', 2, 'Hộp', 9500, 40, '🥛'],
    ['YOGURT', 'Sữa chua có đường', 2, 'Hộp', 7000, 28, '🥣'],
    ['OREO', 'Bánh Oreo vị vani', 3, 'Gói', 16000, 32, '🍪'],
    ['CHOCOPIE', 'Bánh Choco Pie', 3, 'Hộp', 42000, 15, '🍫'],
    ['LAYS', 'Khoai tây Lay’s', 3, 'Gói', 12000, 40, '🥔'],
    ['HAOHAO', 'Mì Hảo Hảo tôm chua cay', 4, 'Gói', 4500, 120, '🍜'],
    ['RICE', 'Gạo thơm ST25', 4, 'Kg', 32000, 80, '🍚', true],
    ['APPLE', 'Táo đỏ nhập khẩu', 4, 'Kg', 65000, 12.5, '🍎', true],
    ['EGGS', 'Trứng gà sạch', 4, 'Vỉ', 30000, 18, '🥚'],
    ['SUNLIGHT', 'Nước rửa chén Sunlight', 5, 'Chai', 29000, 20, '🧴'],
    ['TISSUE', 'Khăn giấy lụa', 5, 'Gói', 18000, 0, '🧻']
  ];
  const state = {
    Staff: [{id: 1, userId: 1, fullName: 'Nguyễn Minh Anh', phoneNumber: '0900000001', employmentStatus: 'working'}, {id: 2, userId: 2, fullName: 'Trần Hoàng Nam', phoneNumber: '0900000002', employmentStatus: 'working'}],
    Counters: [{id: 1, counterCode: 'POS-01', counterName: 'Quầy 01', status: 'ACTIVE'}],
    Customers: [{id: 1, name: 'Nguyễn Thanh Hà', phone: '0901234567', status: 'Active'}, {id: 2, name: 'Lê Tuấn Anh', phone: '0912345678', status: 'Active'}, {id: 3, name: 'Trần Mai Linh', phone: '0987654321', status: 'Active'}],
    Categories: categories.map((name, i) => ({id: i + 1, name})),
    Products: [], ProductVariants: [], InventoryStocks: [], Batches: [], Invoices: [], InvoiceItems: [], Payments: [], SepayTransactions: []
  };
  entries.forEach(([code, name, categoryId, unitName, salePrice, stock, emoji, weight], i) => {
    const id = i + 1;
    state.Products.push({id, code: `MOCK-${code}`, name, categoryId, baseUnit: unitName, allowDecimalQuantity: !!weight, isCombo: false, status: 'Selling', imageUrl: null, emoji});
    state.ProductVariants.push({id, productId: id, unitName, salePrice, conversionFactor: 1, barcode: `290000000${String(id).padStart(4, '0')}`, unitType: weight ? 'WEIGHT' : 'PIECE'});
    state.InventoryStocks.push({variantId: id, quantityOnHand: stock, minThreshold: 5});
    const first = Math.round(stock / 2 * 1000) / 1000;
    for (const [j, quantity] of [first, stock - first].entries()) {
      state.Batches.push({id: i * 2 + j + 1, batchCode: `MOCK-B${id}-${j}`, variantId: id, initialQuantity: quantity, quantity, expirationDate: date(j ? 180 : 30).slice(0, 10), status: 'ACTIVE', updatedAt: date(0)});
    }
  });
  // A second selling unit has its own variant stock, matching the provided MSSQL schema.
  state.ProductVariants.push({id: 17, productId: 1, unitName: 'Lốc 6', salePrice: 56000, conversionFactor: 6, barcode: '2900000000017', unitType: 'PIECE'});
  state.InventoryStocks.push({variantId: 17, quantityOnHand: 10, minThreshold: 2});
  state.Batches.push({id: 33, batchCode: 'MOCK-COCA-PACK', variantId: 17, initialQuantity: 10, quantity: 10, expirationDate: date(180).slice(0, 10), status: 'ACTIVE'});
  for (let i = 1; i <= 3; i++) {
    const paid = i < 3; const product = state.Products[i - 1]; const variant = state.ProductVariants[i - 1];
    state.Invoices.push({id: i, invoiceCode: `MOCK-HD-000${i}`, staffId: i === 2 ? 2 : 1, counterId: 1, scheduleId: null, customerId: i === 1 ? 1 : null, totalAmount: variant.salePrice, promotionDiscount: 0, voucherDiscount: 0, pointDiscount: 0, usedPoints: 0, taxRate: 0, taxAmount: 0, finalAmount: variant.salePrice, status: paid ? 'PAID' : 'CANCELLED', createdAt: date(-i)});
    state.InvoiceItems.push({id: i, invoiceId: i, productId: product.id, variantId: variant.id, productName: product.name, unitName: variant.unitName, unitPrice: variant.salePrice, quantity: 1, baseQuantity: 1, lineTotal: variant.salePrice, batchId: paid ? (i - 1) * 2 + 1 : null});
    if (paid) {
      state.Payments.push({id: i, invoiceId: i, paymentMethod: i === 1 ? 'CASH' : 'BANK_TRANSFER', amount: variant.salePrice, receivedAmount: i === 1 ? 20000 : null, status: 'SUCCESS', createdAt: date(-i)});
      state.InventoryStocks[i - 1].quantityOnHand--;
      state.Batches[(i - 1) * 2].quantity--;
    }
    if (i === 2) state.SepayTransactions.push({id: 1, invoiceId: i, sepayId: 'MOCK-HISTORY-2', transactionContent: 'MOCK-HD-0002', amountIn: variant.salePrice, bankAccountNumber: 'MOCK-ACCOUNT', status: 'SUCCESS', expiresAt: date(-1), createdAt: date(-2), confirmAt: date(-2)});
  }
  return state;
}
module.exports = {createSeed};
