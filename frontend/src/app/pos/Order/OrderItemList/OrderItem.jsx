import {useEffect, useState} from 'react';
import {formatCurrency} from 'utils/formatters';

export default function OrderItem({item, increase, decrease, remove, onChangeQty, disabled}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  useEffect(() => setQuantity(String(item.quantity)), [item.quantity]);
  const commit = async () => {
    if (quantity === '' || Number(quantity) === item.quantity) {setQuantity(String(item.quantity)); return;}
    const saved = await onChangeQty(item.id, Number(quantity));
    if (!saved) setQuantity(String(item.quantity));
  };
  return <tr className="border-top align-middle">
    <td className="text-start"><div className="fw-semibold">{item.productName}</div></td>
    <td><span className={`badge ${item.unitType === 'WEIGHT' ? 'bg-info' : 'bg-secondary'}`}>{item.unitName}</span></td>
    <td className="text-end text-muted">{formatCurrency(item.unitPrice)}</td>
    <td className="text-center"><div className="d-inline-flex align-items-center border rounded overflow-hidden">
      <button className="btn btn-light btn-sm border-0 rounded-0" disabled={disabled} onClick={() => decrease(item.id)} aria-label={`Giảm ${item.productName}`}><i className="bi bi-dash"/></button>
      <input className="form-control form-control-sm text-center border-0 fw-semibold shadow-none order-quantity" aria-label={`Số lượng ${item.productName}`} type="number" min="0" step={item.unitType === 'WEIGHT' ? '0.001' : '1'} disabled={disabled} value={quantity} onChange={e => setQuantity(e.target.value)} onBlur={commit} onKeyDown={e => {if (e.key === 'Enter') e.currentTarget.blur();}}/>
      <button className="btn btn-light btn-sm border-0 rounded-0" disabled={disabled || item.quantity >= item.quantityOnHand} onClick={() => increase(item.id)} aria-label={`Tăng ${item.productName}`}><i className="bi bi-plus"/></button>
    </div></td>
    <td className="text-end fw-bold text-primary">{formatCurrency(item.lineTotal)}</td>
    <td className="text-center"><button className="btn btn-outline-danger btn-sm border-0" disabled={disabled} onClick={() => remove(item.id)} aria-label={`Xóa ${item.productName}`}><i className="bi bi-trash"/></button></td>
  </tr>;
}
