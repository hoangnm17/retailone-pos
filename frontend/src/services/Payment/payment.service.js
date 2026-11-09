import {api} from '../api';

export const processPayment = (id, body) => api(`/invoices/${id}/payments`, {method: 'POST', body});
export const confirmMockTransfer = id => api(`/invoices/${id}/mock-bank-confirm`, {method: 'POST'});
