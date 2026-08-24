// Single place to point the frontend at a backend.
// The build step writes js/env.js with the deployed API URL. When serving the
// source locally, use the local backend unless an environment override exists.

// In production, you can set `window.__SEM_AKAZI_API__` before loading scripts
// (for example, injected by your hosting platform) to override the base URL.

window.API_BASE = window.__SEM_AKAZI_API__ || 'http://localhost:4000/api';
