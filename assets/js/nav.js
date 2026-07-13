/* Shared navbar behaviour: burger toggle + mobile menu.
   Pages that still inline this logic (index, blog, skills, demos, demo) must not
   also load this file — the guard below keeps a double-bind from toggling twice. */
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
  }
})();
