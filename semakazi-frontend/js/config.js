// Single place to point the frontend at a backend.
// For local development, leave this as-is.
// When you deploy, change this one line to your live backend URL
// (e.g. 'https://semakazi-api.onrender.com/api') — nothing else needs to change.

// In production, you can set `window.__SEM_AKAZI_API__` before loading scripts
// (for example, injected by your hosting platform) to override the base URL.

window.API_BASE = window.__SEM_AKAZI_API__ || 'https://semakazi-api.onrender.com/api';
