function normalizeBaseUrl(value) {
  const raw = value || 'http://localhost:8000';
  return String(raw).replace(/\/+$/, '');
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

export class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function parseError(response) {
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = { detail: response.statusText || 'Request failed' };
  }

  const detail = body.detail;
  if (typeof detail === 'string') {
    return new ApiError(detail, response.status, body.errors);
  }
  if (Array.isArray(detail)) {
    return new ApiError('Validation failed', response.status, detail);
  }
  return new ApiError('Request failed', response.status, body.errors);
}

async function request(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

export const api = {
  getDashboard: () => request('/dashboard'),
  getProducts: () => request('/products'),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  getCustomers: () => request('/customers'),
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (data) => request('/customers', { method: 'POST', body: data }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  getOrders: () => request('/orders'),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (data) => request('/orders', { method: 'POST', body: data }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
};

export { API_BASE_URL };
