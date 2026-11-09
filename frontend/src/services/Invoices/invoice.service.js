import {api} from '../api';

export const invoiceGetList = (params = {}, signal) => {
  const query = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null)));
  return api(`/invoices?${query}`, {signal});
};
export const invoiceCreate = (body = {}) => api('/invoices', {method: 'POST', body});
export const invoiceGetDetail = id => api(`/invoices/${id}`);
export const invoiceGetReceipt = id => api(`/invoices/${id}/receipt`);
export const invoiceGetDrafts = () => invoiceGetList({status: 'UNPAID', pageSize: 100});
export const invoiceAddItem = (id, body) => api(`/invoices/${id}/items`, {method: 'POST', body});
export const invoiceSetQuantity = (id, variantId, quantity) => api(`/invoices/${id}/items/${variantId}`, {method: 'PATCH', body: {quantity}});
export const invoiceUpdate = (id, body) => api(`/invoices/${id}`, {method: 'PATCH', body});
export const invoiceCancel = id => api(`/invoices/${id}/cancel`, {method: 'POST'});
