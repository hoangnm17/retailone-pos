import OrderItemList from './OrderItemList/OrderItemList';
import PaymentDetail from './Payment/PaymentDetail';
import PaymentModal from './Payment/PaymentModal';
import {usePos} from 'hooks/pos/usePos';

export default function Order({invoice, showPayment, setShowPayment, onCancel}) {
  const {context, editable, busy, updateInvoice, setQuantity} = usePos();
  const change = (itemId, delta) => {
    const item = invoice.items.find(row => row.id === itemId);
    const step = item.unitType === 'WEIGHT' ? 0.5 : 1;
    return setQuantity(item.variantId, Math.max(0, Number((item.quantity + delta * step).toFixed(3))));
  };
  return <div className="d-flex flex-column h-100 bg-white border-end">
    <div className="p-3 border-bottom"><div className="input-group"><span className="input-group-text bg-white"><i className="bi bi-person text-primary"/></span><select className="form-select" aria-label="Khách hàng" disabled={!editable || busy} value={invoice.customerId || ''} onChange={e => updateInvoice({customerId: e.target.value ? Number(e.target.value) : null})}><option value="">Khách lẻ</option>{context.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></div><div className="small text-muted mt-2 d-flex justify-content-between"><span>Hóa đơn #{invoice.id}</span><span>{invoice.payment?.status === 'PENDING' ? 'Đang chờ chuyển khoản' : invoice.status === 'PAID' ? 'Đã thanh toán' : invoice.status === 'CANCELLED' ? 'Đã hủy' : 'Chưa thanh toán'}</span></div></div>
    <div className="flex-grow-1 overflow-auto p-3 bg-light order-table-scroll"><OrderItemList orderItems={invoice.items} disabled={!editable || busy} increase={id => change(id, 1)} decrease={id => change(id, -1)} remove={id => setQuantity(invoice.items.find(item => item.id === id).variantId, 0)} onChangeQty={(id, quantity) => setQuantity(invoice.items.find(item => item.id === id).variantId, quantity)}/></div>
    <div className="p-3 border-top bg-white shadow-sm"><PaymentDetail invoice={invoice} onCancel={onCancel} onOpenPayment={() => setShowPayment(true)}/></div>
    {showPayment && invoice.status === 'UNPAID' && <PaymentModal invoice={invoice} onClose={() => setShowPayment(false)}/>}
  </div>;
}
