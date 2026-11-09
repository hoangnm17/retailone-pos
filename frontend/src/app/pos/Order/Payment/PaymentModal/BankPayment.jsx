import {useEffect, useState} from 'react';
import {confirmMockTransfer} from 'services/Payment/payment.service';
import {formatCurrency, formatDateTime} from 'utils/formatters';
import {usePos} from 'hooks/pos/usePos';

export default function BankPayment({invoice, disabled, onCreate}) {
  const {refreshInvoice, showNotification} = usePos();
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pending = invoice.payment?.status === 'PENDING';
  const expiresAt = invoice.transaction?.expiresAt;
  const remaining = pending ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000)) : 0;
  useEffect(() => {
    if (!pending) return;
    setNow(Date.now());
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    const expiry = setTimeout(() => refreshInvoice(invoice.id).catch(error => showNotification(error.message, 'error')), Math.max(0, Date.parse(expiresAt) - Date.now()) + 100);
    return () => {clearInterval(ticker); clearTimeout(expiry);};
  }, [pending, expiresAt, invoice.id]);
  const simulate = async () => {
    if (confirming || disabled) return;
    setConfirming(true);
    try {await confirmMockTransfer(invoice.id);} // POS waits for the authoritative SSE state.
    catch (error) {showNotification(error.message, 'error'); await refreshInvoice(invoice.id).catch(() => {});}
    finally {setConfirming(false);}
  };
  return <div className="mt-3 text-center"><span className="badge bg-warning-subtle text-warning-emphasis mb-3">GATEWAY MOCK</span><div className="border rounded-3 bg-light p-4"><i className="bi bi-bank display-4 text-primary"/><h6 className="fw-bold mt-3">{pending ? 'Đang chờ chuyển khoản' : 'Chuyển khoản mô phỏng'}</h6><p className="small text-muted mb-0">Không chuyển tiền thật. Xác nhận được gửi qua SSE.</p></div>
    {pending ? <><div className="border rounded-3 p-3 bg-light mt-3 text-start small"><div className="d-flex justify-content-between mb-2"><span>Số tiền</span><b>{formatCurrency(invoice.payment.amount)}</b></div><div className="mb-2">Tài khoản: <b>MOCK-ACCOUNT</b></div><div className="mb-2">Nội dung: <code className="text-break">{invoice.transaction.transactionContent}</code></div><div>Hết hạn: {formatDateTime(expiresAt)}</div><div className="text-primary mt-2">Còn {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')} · Đang lắng nghe SSE</div></div><button className="btn btn-primary w-100 mt-3" disabled={disabled || confirming || remaining === 0} onClick={simulate}>{confirming ? 'Đang báo có…' : 'Mô phỏng gateway báo có'}</button></> : <button className="btn btn-primary w-100 mt-3" disabled={disabled} onClick={onCreate}>Tạo yêu cầu chuyển khoản mock</button>}
  </div>;
}
