/* Shared navbar behaviour: burger toggle + mobile menu + GA4 nav click tracking. */
(function () {
  if (window.__abNavInit) return;
  window.__abNavInit = true;

  var burger = document.getElementById('navBurger');
  var menu = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  function closeMobileMenu() {
    burger.classList.remove('open');
    menu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
  }
  window.closeMobileMenu = closeMobileMenu;

  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (menu.classList.contains('open')) {
      closeMobileMenu();
    } else {
      burger.classList.add('open');
      menu.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
    }
  });

  document.addEventListener('click', function (e) {
    if (!burger.contains(e.target) && !menu.contains(e.target)) closeMobileMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMobileMenu();
  });

  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMobileMenu);
  });

  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });

    navbar.querySelectorAll('.nav-desktop a, .nav-cta').forEach(function (a) {
      a.addEventListener('click', function () {
        if (typeof gtag !== 'function') return;
        gtag('event', 'nav_click', {
          link_text: a.textContent.trim(),
          link_url: a.getAttribute('href')
        });
      });
    });
  }

  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (typeof gtag !== 'function') return;
      gtag('event', 'nav_click', {
        link_text: a.textContent.trim(),
        link_url: a.getAttribute('href')
      });
    });
  });
})();
