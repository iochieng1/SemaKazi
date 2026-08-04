// Central place for all backend calls. Keeps fetch/error-handling logic
// out of every page. The actual base URL lives in config.js (loaded before
// this file) so it can be changed per environment without touching this code.

const API_BASE = window.API_BASE;

function getToken() {
  return localStorage.getItem('semakazi_token');
}

function setToken(token) {
  localStorage.setItem('semakazi_token', token);
}

function clearToken() {
  localStorage.removeItem('semakazi_token');
}

function getCurrentUser() {
  const raw = localStorage.getItem('semakazi_user');
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('semakazi_user', JSON.stringify(user));
}

async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

const api = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  searchProfiles: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/profiles${query ? `?${query}` : ''}`);
  },
  getProfile: (id) => apiRequest(`/profiles/${id}`),
  updateProfile: (id, payload) => apiRequest(`/profiles/${id}`, { method: 'PUT', body: payload, auth: true }),
  addProofOfWork: (payload) => apiRequest('/proof-of-work', { method: 'POST', body: payload, auth: true }),
  deleteProofOfWork: (id) => apiRequest(`/proof-of-work/${id}`, { method: 'DELETE', auth: true }),
  addReview: (fundiId, payload) => apiRequest(`/reviews/${fundiId}`, { method: 'POST', body: payload }),
  addBadge: (userId, payload) => apiRequest(`/badges/${userId}`, { method: 'POST', body: payload, auth: true })
};
