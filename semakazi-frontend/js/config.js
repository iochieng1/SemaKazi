// Single place to point the frontend at a backend.
// The build step writes js/env.js with the deployed API URL. Keep working when
// that optional build variable is missing by choosing a host-aware default.

// In production, you can set `window.__SEM_AKAZI_API__` before loading scripts
// (for example, injected by your hosting platform) to override the base URL.

const defaultApiBase = ['localhost', '127.0.0.1'].includes(window.location.hostname)
	? 'http://localhost:4000/api'
	: 'https://semakazi-api.onrender.com/api';

window.API_BASE = window.__SEM_AKAZI_API__ || defaultApiBase;
