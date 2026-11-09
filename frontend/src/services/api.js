export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5100/api').trim().replace(/\/+$/, '');
export const apiUrl = path => `${API_BASE_URL}${path}`;

export async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(apiUrl(path), {...options, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body)});
  const result = await res.json();
  if (!res.ok || !result.success) throw new Error(result.message || 'Không thể kết nối máy chủ');
  return result;
}
export const money = value => Number(value || 0).toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2}) + ' ₫';
export const dateTime = value => new Date(value).toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'});
export const statusLabel = {UNPAID: 'Chưa thanh toán', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy', PENDING: 'Chờ chuyển khoản', SUCCESS: 'Thành công', FAILED: 'Thất bại', REFUNDED: 'Đã hoàn tiền', PARTIALLY_REFUNDED: 'Hoàn một phần'};
