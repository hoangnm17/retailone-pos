import {useEffect, useState} from 'react';
import BaseModal from 'components/common/BaseModal';
import {formatCurrency} from 'utils/formatters';
import {usePos} from 'hooks/pos/usePos';
import PaymentMethodSelector from './PaymentModal/PaymentMethodSelector';
import CashPayment from './PaymentModal/CashPayment';
import BankPayment from './PaymentModal/BankPayment';

// Retains the original two-column payment layout; discounts and taxes are server-confirmed.
export default function PaymentModal({invoice, onClose}) {
  const {busy, updateInvoice, pay} = usePos();
  const pending = invoice.payment?.status === 'PENDING';
  const [method, setMethod] = useState(pending ? 'BANK' : 'CASH');
  const [discountAmount, setDiscountAmount] = useState(String(invoice.promotionDiscount));
  const [taxRate, setTaxRate] = useState(String(invoice.taxRate));
  const dirty = Number(discountAmount) !== invoice.promotionDiscount || Number(taxRate) !== invoice.taxRate || discountAmount === '' || taxRate === '';
  useEffect(() => {setDiscountAmount(String(invoice.promotionDiscount)); setTaxRate(String(invoice.taxRate));}, [invoice.id, invoice.promotionDiscount, invoice.taxRate]);
  useEffect(() => {
    const handleKey = event => {if (event.key === 'F4') {event.preventDefault(); if (!busy && !pending) setMethod(value => value === 'CASH' ? 'BANK' : 'CASH');}};
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  }, [pending, busy]);
  return <BaseModal onClose={onClose} maxWidth="980px" disableClose={busy} label="Thanh toán đơn hàng"><div className="bg-white rounded-4 shadow overflow-hidden mx-auto">
    <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom"><h6 className="fw-bold mb-0">Thanh toán đơn hàng #{invoice.id}</h6><button className="btn-close" disabled={busy} aria-label="Đóng thanh toán" onClick={onClose}/></div>
    <div className="p-4"><div className="row g-4">
      <div className="col-md-6 border-end"><h6 className="fw-bold mb-4">Thông tin thanh toán</h6><div className="d-flex justify-content-between small text-muted mb-4"><span>Tạm tính</span><b>{formatCurrency(invoice.totalAmount)}</b></div>
        <fieldset disabled={busy || pending}><label className="form-label small fw-bold" htmlFor="payment-discount">Giảm giá trực tiếp (tối đa 50%)</label><div className="input-group mb-3"><input id="payment-discount" type="number" min="0" step="0.01" max={invoice.totalAmount / 2} className="form-control" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)}/><span className="input-group-text">₫</span></div><label className="form-label small fw-bold" htmlFor="payment-tax">Thuế sau giảm giá</label><div className="input-group mb-3"><input id="payment-tax" type="number" min="0" max="100" step="0.01" className="form-control" value={taxRate} onChange={e => setTaxRate(e.target.value)}/><span className="input-group-text">%</span></div><button className="btn btn-outline-primary w-100" disabled={!dirty || discountAmount === '' || taxRate === ''} onClick={() => updateInvoice({discountAmount: Number(discountAmount), taxRate: Number(taxRate)})}>Áp dụng giảm giá & thuế</button></fieldset>
        <div className="bg-light border rounded-3 p-3 mt-4 small"><div className="d-flex justify-content-between mb-2"><span>Giảm giá đã áp dụng</span><b>−{formatCurrency(invoice.promotionDiscount)}</b></div><div className="d-flex justify-content-between"><span>Tiền thuế ({invoice.taxRate}%)</span><b>{formatCurrency(invoice.taxAmount)}</b></div></div>
        {dirty && <div className="alert alert-warning small mt-3">Áp dụng thay đổi trước khi thanh toán.</div>}
      </div>
      <div className="col-md-6"><div className="mb-3 p-3 border rounded-3 bg-light text-center"><div className="small text-muted mb-1">Tổng cần thanh toán</div><div className="h2 fw-bold text-primary mb-0">{formatCurrency(invoice.finalAmount)}</div></div><PaymentMethodSelector method={method} setMethod={setMethod} disabled={busy || pending}/>
        {method === 'CASH' ? <CashPayment total={invoice.finalAmount} disabled={busy || dirty} onConfirm={receivedAmount => pay({paymentMethod: 'CASH', receivedAmount})}/> : <BankPayment invoice={invoice} disabled={busy || dirty} onCreate={() => pay({paymentMethod: 'BANK_TRANSFER'})}/>}
      </div>
    </div></div>
  </div></BaseModal>;
}
