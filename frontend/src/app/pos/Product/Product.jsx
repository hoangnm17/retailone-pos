import {useMemo, useState} from 'react';
import FilterBar from './Filter/FilterBar';
import ProductList from './ProductList/ProductList';
import Pagination from 'components/Pagination/Pagination';
import {usePos} from 'hooks/pos/usePos';

export default function Product({searchText, onSearchChange, isModalOpen}) {
  const {context, products, addItem, busy, editable, showNotification} = usePos();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [page, setPage] = useState(1);
  const grouped = useMemo(() => {
    const groups = new Map();
    for (const variant of products) {
      if (!groups.has(variant.productId)) groups.set(variant.productId, {...variant, id: variant.productId, units: [], stock: 0});
      const product = groups.get(variant.productId);
      product.units.push({...variant, unitId: variant.variantId, factor: variant.conversionFactor, stock: variant.availableQuantity, price: variant.salePrice, discountedPrice: variant.salePrice});
      product.stock += variant.availableQuantity;
    }
    return [...groups.values()];
  }, [products]);
  const keyword = searchText.trim().toLocaleLowerCase('vi');
  const filtered = grouped.filter(product => (!selectedCategory || product.categoryId === selectedCategory.id) && [product.name, product.code, ...product.units.map(unit => unit.barcode)].some(value => String(value || '').toLocaleLowerCase('vi').includes(keyword)));
  const select = async (product, unit) => {if (await addItem(unit)) onSearchChange('');};
  const scan = async value => {
    const match = products.find(product => product.barcode === value.trim());
    if (match) {if (await addItem(match)) onSearchChange('');}
    else if (filtered.length === 1 && filtered[0].units.length === 1) await select(filtered[0], filtered[0].units[0]);
    else showNotification('Nhập chính xác mã vạch hoặc chọn sản phẩm trong danh sách', 'warning');
  };
  return <div className="d-flex flex-column h-100 p-3 overflow-hidden">
    <FilterBar keyword={searchText} onKeywordChange={value => {onSearchChange(value); setPage(1);}} categories={context.categories} selectedCategory={selectedCategory} onSelectCategory={value => {setSelectedCategory(value); setPage(1);}} addItem={scan} preventFocus={isModalOpen} disabled={busy || !editable}/>
    <div className="d-flex justify-content-between text-muted small mb-3"><span>{filtered.length} sản phẩm · {products.length} đơn vị bán</span><span>Giá chưa gồm thuế</span></div>
    <div className="flex-grow-1 overflow-auto p-1"><ProductList products={filtered.slice((page - 1) * 8, page * 8)} onSelect={select} disabled={busy || !editable}/>{!filtered.length && <div className="text-center text-muted py-5">Không tìm thấy sản phẩm phù hợp.</div>}</div>
    <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / 8))} onPageChange={setPage}/>
  </div>;
}
