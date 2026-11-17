const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}/api${path}`, { ...options, headers });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Máy chủ trả về phản hồi không hợp lệ', response.status);
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError(payload.message || 'Đã xảy ra lỗi, vui lòng thử lại', response.status, payload.code);
  }
  return payload;
}

export const authApi = {
  login: (credentials) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (details) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(details) }),
  me: (token) => apiRequest('/auth/me', { token }),
  forgotPassword: (email) =>
    apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) =>
    apiRequest(`/auth/reset-password/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
};

export const userApi = {
  updateProfile: (token, details) =>
    apiRequest('/users/me', { token, method: 'PUT', body: JSON.stringify(details) }),
  changePassword: (token, details) =>
    apiRequest('/users/me/password', { token, method: 'PUT', body: JSON.stringify(details) }),
};
