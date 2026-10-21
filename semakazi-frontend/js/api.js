// Central place for all backend calls. Keeps fetch/error-handling logic
// out of every page. The actual base URL lives in config.js (loaded before
// this file) so it can be changed per environment without touching this code.

const API_BASE = window.API_BASE;

// Every value from the API is user-supplied text. Pass it through
// escapeHtml before interpolating it into an innerHTML template, so names,
// bios, reviews and messages always display as text, never as markup.
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// Returns the URL only if it is a well-formed https: link, else null, so a
// stored javascript: or data: URL can never end up in a src or href.
function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// Phone numbers reduced to digits and a leading +, safe for tel: links.
function phoneDigits(phone) {
  return String(phone ?? '').replace(/[^0-9+]/g, '');
}

// Shows an error message in el as plain text, replacing its contents.
function renderError(el, message) {
  const p = document.createElement('p');
  p.className = 'error-message';
  p.textContent = message;
  el.replaceChildren(p);
}

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
  addReview: (fundiId, payload) => apiRequest(`/reviews/${fundiId}`, { method: 'POST', body: payload, auth: true }),
  flagReview: (reviewId) => apiRequest(`/reviews/${reviewId}/flag`, { method: 'POST', auth: true }),
  addBadge: (userId, payload) => apiRequest(`/badges/${userId}`, { method: 'POST', body: payload, auth: true }),
  sendRequest: (payload) => apiRequest('/requests', { method: 'POST', body: payload, auth: true }),
  getIncomingRequests: () => apiRequest('/requests/incoming', { auth: true }),
  getOutgoingRequests: () => apiRequest('/requests/outgoing', { auth: true }),
  updateRequestStatus: (id, status) => apiRequest(`/requests/${id}/status`, { method: 'PUT', body: { status }, auth: true })
};

