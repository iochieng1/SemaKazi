// Renders the nav bar into any page that includes a <div id="nav"></div>,
// adjusting links based on whether a user is logged in.

function renderNav() {
  const navEl = document.getElementById('nav');
  if (!navEl) return;

  const user = getCurrentUser();

  navEl.innerHTML = `
    <a class="brand" href="/index.html">SemaKazi</a>
    <div class="links">
      <a href="/pages/search.html">Find a fundi</a>
      ${user
        ? `<a href="/pages/dashboard.html">Dashboard</a><a href="#" id="logout-link">Log out</a>`
        : `<a href="/pages/login.html">Log in</a><a href="/pages/register.html">Sign up</a>`
      }
    </div>
  `;

  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearToken();
      localStorage.removeItem('semakazi_user');
      window.location.href = '/index.html';
    });
  }
}

document.addEventListener('DOMContentLoaded', renderNav);