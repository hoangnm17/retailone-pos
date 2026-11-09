import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {api, apiUrl} from 'services/api';
import * as invoicesApi from 'services/Invoices/invoice.service';
import {processPayment} from 'services/Payment/payment.service';
import {useNotification} from 'components/global/Notification/NotificationContext';

const PosContext = createContext(null);

export function PosProvider({children}) {
  const {showNotification} = useNotification();
  const [context, setContext] = useState(null);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const operationRunning = useRef(false);
  const invoicesRef = useRef(invoices); invoicesRef.current = invoices;
  const pendingPrint = useRef(new Set());
  const printed = useRef(new Set());

  const upsert = useCallback((row, insert = true) => {
    setInvoices(old => old.some(item => item.id === row.id) ? old.map(item => item.id === row.id ? row : item) : insert ? [...old, row] : old);
  }, []);
  const refreshProducts = useCallback(async () => setProducts((await api('/products')).data), []);
  const paymentSuccess = useCallback(invoice => {
    upsert(invoice, false);
    if (pendingPrint.current.has(invoice.id) && !printed.current.has(invoice.id)) {
      printed.current.add(invoice.id); pendingPrint.current.delete(invoice.id);
      setReceipt({invoice, autoPrint: true});
      showNotification('Success · Thanh toán thành công!', 'success');
    }
    refreshProducts().catch(err => showNotification(err.message, 'error'));
  }, [upsert, refreshProducts, showNotification]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ctx, catalog, drafts] = await Promise.all([api('/context'), api('/products'), invoicesApi.invoiceGetDrafts()]);
        let rows = await Promise.all(drafts.data.map(row => invoicesApi.invoiceGetDetail(row.id).then(result => result.data)));
        if (!rows.length) rows = [(await invoicesApi.invoiceCreate()).data];
        if (!alive) return;
        rows.filter(row => row.payment?.status === 'PENDING').forEach(row => pendingPrint.current.add(row.id));
        setContext(ctx.data); setProducts(catalog.data); setInvoices(rows); setActiveInvoiceId(rows[0].id);
      } catch (err) {if (alive) setError(err.message);}
      finally {if (alive) setLoading(false);}
    })();
    return () => {alive = false;};
  }, []);

  const subscriptionIds = [...new Set([activeInvoiceId, ...invoices.filter(row => row.payment?.status === 'PENDING').map(row => row.id)])].filter(Boolean).sort((a, b) => a - b).join(',');
  useEffect(() => {
    if (!subscriptionIds) return;
    const streams = subscriptionIds.split(',').map(target => {
      const events = new EventSource(apiUrl(`/invoices/${target}/events`));
      const stateChanged = event => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.invoice?.status === 'PAID') paymentSuccess(payload.invoice);
          else if (payload.invoice) upsert(payload.invoice, false);
        } catch {showNotification('Không đọc được sự kiện thanh toán', 'error');}
      };
      const refresh = () => invoicesApi.invoiceGetDetail(target).then(result => upsert(result.data, false)).catch(err => showNotification(err.message, 'error'));
      events.addEventListener('SNAPSHOT', stateChanged);
      events.addEventListener('PAYMENT_SUCCESS', stateChanged);
      events.addEventListener('INVOICE_CANCELLED', refresh);
      events.addEventListener('PAYMENT_EXPIRED', () => {
        pendingPrint.current.delete(Number(target));
        showNotification('Yêu cầu chuyển khoản đã hết hạn. Có thể thử lại.', 'warning');
        refresh(); refreshProducts().catch(() => {});
      });
      return events;
    });
    return () => streams.forEach(events => events.close());
  }, [subscriptionIds, paymentSuccess, upsert, refreshProducts, showNotification]);

  const run = useCallback(async work => {
    if (operationRunning.current) return null;
    operationRunning.current = true; setBusy(true);
    try {return await work();}
    catch (err) {showNotification(err.message, 'error'); return null;}
    finally {operationRunning.current = false; setBusy(false);}
  }, [showNotification]);

  const createInvoiceTab = () => run(async () => {
    const row = (await invoicesApi.invoiceCreate()).data;
    upsert(row); setActiveInvoiceId(row.id); return row;
  });
  const openInvoice = target => run(async () => {
    const row = (await invoicesApi.invoiceGetDetail(target)).data;
    upsert(row); setActiveInvoiceId(row.id);
    if (row.payment?.status === 'PENDING') pendingPrint.current.add(row.id);
    return row;
  });
  const closeTab = target => run(async () => {
    const row = invoicesRef.current.find(item => item.id === target);
    if (!row) return null;
    if (row.status === 'UNPAID') await invoicesApi.invoiceCancel(target);
    pendingPrint.current.delete(target);
    let remaining = invoicesRef.current.filter(item => item.id !== target);
    if (!remaining.length) remaining = [(await invoicesApi.invoiceCreate()).data];
    setInvoices(remaining);
    setActiveInvoiceId(current => current === target ? remaining[0].id : current);
    await refreshProducts(); return true;
  });
  const addItem = selection => run(async () => {
    const body = typeof selection === 'string' ? {barcode: selection.trim(), quantity: 1} : {variantId: selection.variantId, quantity: selection.unitType === 'WEIGHT' ? 0.5 : 1};
    const row = (await invoicesApi.invoiceAddItem(activeInvoiceId, body)).data;
    upsert(row); window.dispatchEvent(new Event('RE_FOCUS_SEARCH')); return row;
  });
  const setQuantity = (variantId, quantity) => run(async () => {
    const row = (await invoicesApi.invoiceSetQuantity(activeInvoiceId, variantId, quantity)).data;
    upsert(row); return row;
  });
  const updateInvoice = body => run(async () => {
    const row = (await invoicesApi.invoiceUpdate(activeInvoiceId, body)).data;
    upsert(row); return row;
  });
  const pay = body => run(async () => {
    pendingPrint.current.add(activeInvoiceId);
    const row = (await processPayment(activeInvoiceId, body)).data;
    upsert(row);
    if (row.status === 'PAID') paymentSuccess(row);
    await refreshProducts(); return row;
  });
  const refreshInvoice = async target => {
    const row = (await invoicesApi.invoiceGetDetail(target ?? activeInvoiceId)).data;
    if (row.status === 'PAID') paymentSuccess(row); else upsert(row);
    return row;
  };
  const showReceipt = target => run(async () => {
    const row = (await invoicesApi.invoiceGetReceipt(target)).data;
    setReceipt({invoice: row, autoPrint: false}); return row;
  });
  const storedInvoice = invoices.find(row => row.id === activeInvoiceId);
  const activeInvoice = storedInvoice ? {...storedInvoice, items: storedInvoice.items.map(item => ({...item,
    unitType: products.find(p => p.variantId === item.variantId)?.unitType || 'PIECE',
    quantityOnHand: products.find(p => p.variantId === item.variantId)?.availableQuantity || 0
  }))} : null;
  const editable = activeInvoice?.status === 'UNPAID' && activeInvoice.payment?.status !== 'PENDING';

  return <PosContext.Provider value={{context, products, invoices, activeInvoice, activeInvoiceId, setActiveInvoiceId, busy, loading, error, editable, receipt, closeReceipt: () => setReceipt(null), createInvoiceTab, openInvoice, closeTab, addItem, setQuantity, updateInvoice, pay, refreshInvoice, showReceipt, showNotification}}>{children}</PosContext.Provider>;
}

export const usePos = () => useContext(PosContext);
