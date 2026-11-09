import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {invoiceGetList} from 'services/Invoices/invoice.service';
import Pagination from 'components/Pagination/Pagination';
import {formatCurrency, formatDateTime} from 'utils/formatters';
import useDebounce from 'hooks/common/useDebounce';
import useTitle from 'hooks/common/useTitle';
import {usePos} from 'hooks/pos/usePos';
import InvoiceDetailModal from './InvoiceDetailModal';
import {statusLabel} from 'services/api';

const initialFilters = {search: '', from: '', to: '', staffId: '', customerId: '', status: '', paymentStatus: ''};

// Scoped from the original InvoicePage: history/view/print only, no returns or restocking.
export default function InvoicePage() {
  const {context, loading: booting, error: bootError, showNotification, showReceipt, openInvoice, createInvoiceTab, busy} = usePos();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [pagination, setPagination] = useState({totalItems: 0, totalPages: 0});
  const [revision, setRevision] = useState(0);
  const search = useDebounce(filters.search, 300);
  useTitle('Lịch sử hóa đơn');
  const {from, to, staffId, customerId, status, paymentStatus} = filters;
  useEffect(() => {
    const abort = new AbortController(); setLoading(true);
    invoiceGetList({search, from, to, staffId, customerId, status, paymentStatus, page, pageSize: 10}, abort.signal)
      .then(result => {setRows(result.data); setPagination(result.pagination);})
      .catch(error => {if (error.name !== 'AbortError') {setRows([]); setPagination({totalItems: 0, totalPages: 0}); showNotification(error.message, 'error');}})
      .finally(() => {if (!abort.signal.aborted) setLoading(false);});
    return () => abort.abort();
  }, [search, from, to, staffId, customerId, status, paymentStatus, page, revision, showNotification]);
  const change = (name, value) => {setFilters(current => ({...current, [name]: value})); setPage(1);};
  const resume = async id => {if (await openInvoice(id)) navigate('/sales');};
  if (booting) return <div className="p-5 text-center text-muted">Đang tải dữ liệu POS…</div>;
  if (bootError) return <div className="p-5 text-danger">{bootError}</div>;
  return <div className="bg-light min-vh-100 py-4"><div className="container-fluid px-lg-5">
    <div className="d-md-flex justify-content-between align-items-center mb-4"><div><h3 className="fw-bold text-dark mb-1">Hóa đơn bán hàng</h3><p className="text-muted small mb-0">Quản lý và theo dõi lịch sử giao dịch</p></div><div className="d-flex gap-2 mt-3 mt-md-0"><button className="btn btn-outline-primary" onClick={() => navigate('/sales')}>Về POS</button><button className="btn btn-primary shadow-sm px-4 fw-bold" disabled={busy} onClick={async () => {if (await createInvoiceTab()) navigate('/sales');}}><i className="bi bi-plus-lg me-2"/>Tạo hóa đơn mới</button></div></div>
    <div className="card border-0 shadow-sm mb-4"><div className="card-body p-3"><div className="row g-3">
      <div className="col-md-5"><div className="input-group border rounded-2"><span className="input-group-text bg-transparent border-0"><i className="bi bi-search text-muted"/></span><input className="form-control border-0 shadow-none" aria-label="Tìm hóa đơn" placeholder="Mã hóa đơn, khách hàng, điện thoại, thu ngân…" value={filters.search} onChange={e => change('search', e.target.value)}/></div></div>
      <div className="col-md-7 d-flex justify-content-md-end flex-wrap gap-2">{['', 'UNPAID', 'PAID', 'CANCELLED'].map(value => <button key={value} className={`btn btn-sm rounded-pill px-3 fw-medium ${status === value ? 'btn-primary' : 'btn-outline-secondary border-light-subtle'}`} onClick={() => change('status', value)}>{value ? statusLabel[value] : 'Tất cả'}</button>)}</div>
      <div className="col-sm-6 col-lg-2"><label className="form-label small" htmlFor="history-from">Từ ngày</label><input className="form-control form-control-sm" id="history-from" type="date" value={from} onChange={e => change('from', e.target.value)}/></div><div className="col-sm-6 col-lg-2"><label className="form-label small" htmlFor="history-to">Đến ngày</label><input className="form-control form-control-sm" id="history-to" type="date" value={to} onChange={e => change('to', e.target.value)}/></div>
      <div className="col-sm-6 col-lg-2"><label className="form-label small" htmlFor="history-staff">Thu ngân</label><select className="form-select form-select-sm" id="history-staff" value={staffId} onChange={e => change('staffId', e.target.value)}><option value="">Tất cả thu ngân</option>{context.staff.map(staff => <option key={staff.id} value={staff.id}>{staff.fullName}</option>)}</select></div>
      <div className="col-sm-6 col-lg-2"><label className="form-label small" htmlFor="history-customer">Khách hàng</label><select className="form-select form-select-sm" id="history-customer" value={customerId} onChange={e => change('customerId', e.target.value)}><option value="">Tất cả khách hàng</option>{context.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
      <div className="col-sm-6 col-lg-2"><label className="form-label small" htmlFor="history-payment">Thanh toán</label><select className="form-select form-select-sm" id="history-payment" value={paymentStatus} onChange={e => change('paymentStatus', e.target.value)}><option value="">Tất cả thanh toán</option>{['PENDING', 'SUCCESS', 'FAILED', 'NONE'].map(value => <option key={value} value={value}>{statusLabel[value] || 'Chưa tạo thanh toán'}</option>)}</select></div>
      <div className="col-sm-6 col-lg-2 d-flex gap-2 align-items-end"><button className="btn btn-sm btn-light" onClick={() => {setFilters(initialFilters); setPage(1);}}>Xóa lọc</button><button className="btn btn-sm btn-outline-primary" onClick={() => setRevision(value => value + 1)}>Làm mới</button></div>
    </div></div></div>
    <div className="card border-0 shadow-sm overflow-hidden"><div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead className="table-light"><tr>{['Mã đơn', 'Thời gian', 'Khách hàng', 'Thu ngân', 'Tổng tiền', 'Trạng thái', 'Thao tác'].map(title => <th key={title} className="py-3 px-3 text-secondary small text-nowrap">{title}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan="7" className="text-center py-5 text-muted">Đang tải dữ liệu…</td></tr> : !rows.length ? <tr><td colSpan="7" className="text-center py-5 text-muted">Không có hóa đơn phù hợp.</td></tr> : rows.map(invoice => <tr key={invoice.id}><td className="fw-bold text-primary px-3 small text-nowrap" title={invoice.invoiceCode}>#{invoice.invoiceCode.length > 22 ? invoice.invoiceCode.slice(0, 18) + '…' : invoice.invoiceCode}</td><td className="text-muted small text-nowrap">{formatDateTime(invoice.createdAt)}</td><td>{invoice.customer?.name || <span className="text-muted small">Khách lẻ</span>}</td><td className="small">{invoice.staffName}</td><td className="fw-bold text-nowrap">{formatCurrency(invoice.finalAmount)}</td><td><span className={`badge rounded-pill px-3 py-2 ${invoice.status === 'PAID' ? 'bg-success-subtle text-success' : invoice.status === 'CANCELLED' ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning-emphasis'}`}>{statusLabel[invoice.status]}</span><small className="d-block text-muted mt-1">{statusLabel[invoice.payment?.status] || 'Chưa tạo thanh toán'}</small></td><td><div className="btn-group border rounded-2"><button className="btn btn-sm text-primary" aria-label={`Xem hóa đơn ${invoice.id}`} onClick={() => setDetailId(invoice.id)}><i className="bi bi-eye"/></button>{invoice.status === 'PAID' && <button className="btn btn-sm text-secondary" aria-label={`In hóa đơn ${invoice.id}`} disabled={busy} onClick={() => showReceipt(invoice.id)}><i className="bi bi-printer"/></button>}{invoice.status === 'UNPAID' && <button className="btn btn-sm text-success" aria-label={`Thanh toán hóa đơn ${invoice.id}`} disabled={busy} onClick={() => resume(invoice.id)}><i className="bi bi-credit-card-fill"/></button>}</div></td></tr>)}
    </tbody></table></div><div className="card-footer bg-white border-0 py-3"><div className="small text-muted">{pagination.totalItems} hóa đơn</div><Pagination currentPage={page} totalPages={Math.max(1, pagination.totalPages)} onPageChange={setPage}/></div></div>
  </div>{detailId && <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} onResume={resume}/>}</div>;
}
