import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Order from './Order/Order';
import Product from './Product/Product';
import BaseModal from 'components/common/BaseModal';
import useTitle from 'hooks/common/useTitle';
import {usePos} from 'hooks/pos/usePos';

// Scoped from localstore-pos/frontend/src/app/pos/SalesPage.js.
export default function SalesPage() {
  const pos = usePos();
  const {context, invoices, activeInvoice, activeInvoiceId, setActiveInvoiceId, createInvoiceTab, closeTab, busy, loading, error, editable, receipt} = pos;
  const [showMenu, setShowMenu] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [searchText, setSearchText] = useState('');
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const currentUser = context?.staff.find(staff => staff.id === context.staffId);
  useTitle(activeInvoice ? `HĐ ${activeInvoice.id} - ${activeInvoice.customer?.name || 'Khách lẻ'}` : 'Đang tải POS');

  useEffect(() => {setShowPayment(false); setSearchText('');}, [activeInvoiceId]);
  useEffect(() => {
    const handleOutside = event => {if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);};
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);
  const requestClose = invoice => invoice.status === 'UNPAID' ? setCancelTarget(invoice) : closeTab(invoice.id);
  useEffect(() => {
    const handle = event => {
      if (window.isModalOpen > 0 || receipt) return;
      if (event.key === 'F2') {event.preventDefault(); createInvoiceTab();}
      if (event.key === 'F12' || event.key === 'F8') {
        event.preventDefault();
        if (activeInvoice?.items.length && (editable || activeInvoice.payment?.status === 'PENDING')) setShowPayment(true);
      }
      if (event.ctrlKey && ['ArrowRight', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault();
        const current = invoices.findIndex(row => row.id === activeInvoiceId);
        const step = event.key === 'ArrowRight' ? 1 : -1;
        setActiveInvoiceId(invoices[(current + step + invoices.length) % invoices.length].id);
      }
      if (event.ctrlKey && event.key === 'Delete' && activeInvoice) {event.preventDefault(); requestClose(activeInvoice);}
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  });

  if (loading) return <div className="vh-100 d-flex flex-column align-items-center justify-content-center gap-3"><span className="spinner-border text-primary"/><b>ĐANG KHỞI TẠO HỆ THỐNG POS…</b></div>;
  if (error || !activeInvoice) return <div className="p-5 text-center"><h3>Chưa mở được quầy bán hàng</h3><p className="text-danger">{error}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Thử lại</button></div>;

  return <div className="pos-shell d-flex flex-column bg-light text-dark">
    <header className="d-flex align-items-center bg-white border-bottom flex-shrink-0 pe-2 pos-tab-header">
      <div className="d-flex align-items-end flex-grow-1 overflow-auto no-scrollbar h-100 pt-2 px-2" role="tablist" aria-label="Hóa đơn">
        {invoices.map((invoice, index) => <div className={`chrome-tab d-flex align-items-center gap-2 px-3 ${invoice.id === activeInvoiceId ? 'active' : ''} ${invoice.status === 'PAID' ? 'bg-success text-white border-success' : ''}`} key={invoice.id}>
          <button className="tab-label" role="tab" aria-selected={invoice.id === activeInvoiceId} disabled={busy} onClick={() => setActiveInvoiceId(invoice.id)}><i className={`bi ${invoice.status === 'PAID' ? 'bi-check-circle-fill' : 'bi-file-earmark-text'}`}/> HĐ {index + 1}{invoice.status === 'PAID' ? ' (Đã xong)' : ''}</button>
          <button className="tab-close" disabled={busy} aria-label={`Đóng hóa đơn ${index + 1}`} onClick={() => requestClose(invoice)}><i className="bi bi-x-circle-fill close-icon"/></button>
        </div>)}
        <button className="btn-add-tab mb-2 ms-2 flex-shrink-0" disabled={busy} onClick={createInvoiceTab} aria-label="Thêm hóa đơn mới" title="Thêm hóa đơn mới (F2)"><i className="bi bi-plus-lg"/></button>
      </div>
      <div className="ms-auto position-relative flex-shrink-0" ref={menuRef}>
        <button className="btn border-0 d-flex align-items-center gap-2 px-3 py-2 rounded-3" aria-label="Menu thu ngân" onClick={() => setShowMenu(value => !value)}><span className="fw-bold small text-primary d-none d-sm-block">{currentUser?.fullName || 'Thu ngân demo'}</span><i className="bi bi-person-circle fs-4 text-primary"/></button>
        {showMenu && <div className="dropdown-custom shadow-lg border rounded-3 overflow-hidden"><button className="dropdown-item py-2 px-3 border-0" onClick={() => navigate('/invoices')}><i className="bi bi-receipt me-3 text-primary"/>Lịch sử đơn hàng</button></div>}
      </div>
    </header>
    <main className="pos-workspace d-flex flex-grow-1 overflow-hidden">
      <aside className="pos-order-column d-flex flex-column border-end bg-white glass-effect shadow-sm">
        <Order invoice={activeInvoice} showPayment={showPayment} setShowPayment={setShowPayment} onCancel={() => setCancelTarget(activeInvoice)}/>
      </aside>
      <section className="pos-product-column d-flex flex-column bg-light">
        <Product searchText={searchText} onSearchChange={setSearchText} isModalOpen={showPayment || !!cancelTarget || !!receipt}/>
      </section>
    </main>
    {cancelTarget && <BaseModal onClose={() => setCancelTarget(null)} maxWidth="450px" disableClose={busy}><div className="bg-white rounded-4 p-4 shadow"><h5 className="fw-bold">Hủy hóa đơn #{cancelTarget.id}?</h5><p className="text-muted small mt-3">Hóa đơn sẽ được đánh dấu đã hủy. Hàng đang giữ cho chuyển khoản sẽ được hoàn tồn.</p><div className="d-flex gap-2 justify-content-end mt-4"><button className="btn btn-light" disabled={busy} onClick={() => setCancelTarget(null)}>Tiếp tục bán</button><button className="btn btn-danger" disabled={busy} onClick={async () => {if (await closeTab(cancelTarget.id)) setCancelTarget(null);}}>Xác nhận hủy</button></div></div></BaseModal>}
  </div>;
}
