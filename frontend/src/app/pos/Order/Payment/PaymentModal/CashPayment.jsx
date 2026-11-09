import {useEffect, useRef, useState} from 'react';
import {formatCurrency} from 'utils/formatters';

export default function CashPayment({total, onConfirm, disabled}) {
  const [customerPay, setCustomerPay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const received = Number(customerPay);
  const change = Math.max(0, received - total);
  const submit = async () => {
    if (disabled || submitting || customerPay === '' || received < total) return;
    setSubmitting(true);
    try {await onConfirm(received);} finally {setSubmitting(false);}
  };
  useEffect(() => {inputRef.current?.focus();}, []);
  useEffect(() => {
    const handleKey = event => {
      if (event.key === 'F9') {event.preventDefault(); if (!disabled) setCustomerPay(String(total));}
      if (event.key === 'F10') {event.preventDefault(); submit();}
    };
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  });
  return <form onSubmit={event => {event.preventDefault(); submit();}}>
    <label className="form-label small fw-bold text-muted" htmlFor="cash-received">TIỀN KHÁCH ĐƯA</label><input id="cash-received" ref={inputRef} placeholder="Nhập số tiền" type="number" min="0" step="0.01" disabled={disabled || submitting} className="form-control form-control-lg fw-bold text-primary mb-3" value={customerPay} onChange={event => setCustomerPay(event.target.value)}/>
    <button type="button" className="btn btn-warning small fw-bold border-0 mb-3" disabled={disabled || submitting} onClick={() => setCustomerPay(String(total))}>Đủ tiền (F9)</button>
    <div className={`d-flex justify-content-between align-items-center p-4 rounded-4 mb-4 border ${change > 0 ? 'bg-success bg-opacity-10 border-success border-opacity-25' : 'bg-light border-light'}`}><div><div className="small text-muted fw-bold text-uppercase">Tiền thừa</div><div className={`display-6 fw-bold ${change > 0 ? 'text-success' : 'text-secondary'}`}>{formatCurrency(change)}</div></div></div>
    <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold shadow" disabled={disabled || submitting || customerPay === '' || received < total}>{submitting ? 'ĐANG XỬ LÝ…' : 'XÁC NHẬN (ENTER / F10)'}</button>
  </form>;
}
