/* Theme switch: light (default) <-> black. Applied ASAP, remembered in
   localStorage, and a toggle button is injected into the floating nav pill. */
(function () {
  var root = document.documentElement;
  var urlTheme = null;
  try { urlTheme = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  try {
    var pref = urlTheme || localStorage.getItem('ab-theme');
    if (pref === 'dark') root.setAttribute('data-theme', 'dark');
    else if (pref === 'light') root.removeAttribute('data-theme');
    if (urlTheme) localStorage.setItem('ab-theme', urlTheme);
  } catch (e) {}

  function icon(btn) {
    var dark = root.getAttribute('data-theme') === 'dark';
    btn.textContent = dark ? '☀' : '☾';
    btn.setAttribute('aria-label', dark ? 'Passer en thème clair' : 'Passer en thème sombre');
    btn.title = dark ? 'Thème clair' : 'Thème sombre';
  }

  function init() {
    if (document.getElementById('themeToggle')) return;
    var pill = document.querySelector('.nav-pill');
    if (!pill) return;
    var btn = document.createElement('button');
    btn.id = 'themeToggle';
    btn.className = 'theme-toggle';
    btn.type = 'button';
    icon(btn);
    btn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark';
      if (dark) { root.removeAttribute('data-theme'); }
      else { root.setAttribute('data-theme', 'dark'); }
      try { localStorage.setItem('ab-theme', dark ? 'light' : 'dark'); } catch (e) {}
      icon(btn);
    });
    var cta = pill.querySelector('.nav-cta') || pill.querySelector('.nav-burger');
    if (cta) pill.insertBefore(btn, cta); else pill.appendChild(btn);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
