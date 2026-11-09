import {useEffect, useState} from 'react';
import BaseModal from 'components/common/BaseModal';
import {invoiceGetDetail} from 'services/Invoices/invoice.service';
import {formatCurrency, formatDateTime} from 'utils/formatters';
import {statusLabel} from 'services/api';
import {usePos} from 'hooks/pos/usePos';

export default function InvoiceDetailModal({invoiceId, onClose, onResume}) {
  const {showReceipt, busy} = usePos();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {let alive = true; invoiceGetDetail(invoiceId).then(result => {if (alive) setInvoice(result.data);}).catch(err => {if (alive) setError(err.message);}); return () => {alive = false;};}, [invoiceId]);
  return <BaseModal onClose={onClose} maxWidth="900px" label="Chi tiết hóa đơn"><div className="bg-white rounded-4 overflow-hidden shadow">
    <div className="d-flex justify-content-between align-items-center p-4 border-bottom"><h5 className="fw-bold m-0">Chi tiết hóa đơn #{invoiceId}</h5><button className="btn-close" onClick={onClose} aria-label="Đóng chi tiết hóa đơn"/></div>
    <div className="p-4">{error ? <div className="alert alert-danger">{error}</div> : !invoice ? <div className="py-5 text-center text-muted">Đang tải…</div> : <>
      <div className="row g-3 small mb-4"><div className="col-md-6"><div className="fw-bold text-break mb-2">{invoice.invoiceCode}</div><div>{formatDateTime(invoice.createdAt)}</div><div className="mt-2">Thu ngân: {invoice.staffName} · {invoice.counterName}</div></div><div className="col-md-6"><div>Khách: {invoice.customer?.name || 'Khách lẻ'}</div><div>{invoice.customer?.phone}</div><div className="mt-2">{statusLabel[invoice.status]} · {statusLabel[invoice.payment?.status] || 'Chưa thanh toán'}</div></div></div>
      <div className="table-responsive"><table className="table align-middle"><thead className="table-light"><tr><th>Sản phẩm</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th className="text-end">Thành tiền</th></tr></thead><tbody>{invoice.items.map(item => <tr key={item.id}><td>{item.productName}</td><td>{item.unitName}</td><td>{item.quantity}</td><td>{formatCurrency(item.unitPrice)}</td><td className="text-end fw-bold">{formatCurrency(item.lineTotal)}</td></tr>)}</tbody></table></div>
      <div className="d-flex justify-content-end"><div className="bg-light border rounded-3 p-3 invoice-summary"><div className="d-flex justify-content-between mb-2"><span>Tạm tính</span><b>{formatCurrency(invoice.totalAmount)}</b></div><div className="d-flex justify-content-between mb-2"><span>Giảm giá</span><span>−{formatCurrency(invoice.promotionDiscount)}</span></div><div className="d-flex justify-content-between mb-3"><span>Thuế ({invoice.taxRate}%)</span><span>{formatCurrency(invoice.taxAmount)}</span></div><div className="d-flex justify-content-between fw-bold text-primary"><span>Tổng cộng</span><span>{formatCurrency(invoice.finalAmount)}</span></div></div></div>
    </>}</div><div className="bg-light p-3 border-top d-flex justify-content-end gap-2">{invoice?.status === 'UNPAID' && <button className="btn btn-primary" disabled={busy} onClick={() => onResume(invoiceId)}>Thanh toán ngay</button>}{invoice?.status === 'PAID' && <button className="btn btn-outline-primary" disabled={busy} onClick={async () => {if (await showReceipt(invoiceId)) onClose();}}>In biên lai</button>}<button className="btn btn-dark" onClick={onClose}>Đóng</button></div>
  </div></BaseModal>;
}
