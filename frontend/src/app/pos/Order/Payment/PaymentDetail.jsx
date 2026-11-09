import {formatCurrency} from 'utils/formatters';
import {usePos} from 'hooks/pos/usePos';

export default function PaymentDetail({invoice, onOpenPayment, onCancel}) {
  const {busy, showReceipt, createInvoiceTab} = usePos();
  const quantity = Number(invoice.items.reduce((sum, item) => sum + item.quantity, 0).toFixed(3));
  return <div className="p-3 bg-white border-top shadow-lg position-relative rounded-top-4">
    <div className="d-flex justify-content-center mb-3"><div className="bg-light border rounded-pill" style={{width:40,height:5}}/></div>
    <div className="d-flex justify-content-between align-items-center mb-2 px-2 small"><span className="text-muted">Tạm tính ({quantity} mặt hàng)</span><b>{formatCurrency(invoice.totalAmount)}</b></div>
    <div className="d-flex justify-content-between px-2 small mb-2"><span className="text-muted">Giảm giá</span><span className="text-danger">−{formatCurrency(invoice.promotionDiscount)}</span></div>
    <div className="d-flex justify-content-between px-2 small"><span className="text-muted">Thuế ({invoice.taxRate}%)</span><span>{formatCurrency(invoice.taxAmount)}</span></div>
    <hr className="my-3 opacity-25"/>
    <div className="d-flex justify-content-between align-items-center mb-3 px-2"><h6 className="fw-bold mb-0 text-uppercase">Tổng cộng</h6><h3 className="fw-bold mb-0 text-primary">{formatCurrency(invoice.finalAmount)}</h3></div>
    {invoice.status === 'UNPAID' ? <div className="d-flex gap-2"><button className="btn btn-outline-danger rounded-pill" disabled={busy} onClick={onCancel} aria-label="Hủy hóa đơn"><i className="bi bi-trash"/></button><button className="btn btn-primary w-100 py-3 rounded-pill fw-bold shadow-sm" disabled={busy || !invoice.items.length} onClick={onOpenPayment}><i className="bi bi-shield-check me-2"/>{invoice.payment?.status === 'PENDING' ? 'XEM CHUYỂN KHOẢN' : 'THANH TOÁN (F12)'}</button></div> : <div className="d-flex gap-2"><button className="btn btn-outline-primary flex-fill rounded-pill" disabled={busy} onClick={createInvoiceTab}>Hóa đơn mới</button>{invoice.status === 'PAID' && <button className="btn btn-primary flex-fill rounded-pill" disabled={busy} onClick={() => showReceipt(invoice.id)}>In biên lai</button>}</div>}
  </div>;
}
