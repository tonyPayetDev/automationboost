/* ============================================
   AutomationBoost - Scripts Principal
   ============================================ */

// --- NAV SCROLL ---
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
});

// --- FADE IN ON SCROLL ---
const fadeEls = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12 });

fadeEls.forEach(el => observer.observe(el));

// --- COUNTDOWN ---
function getEndDate() {
  const stored = localStorage.getItem('ab_end');
  if (stored) return new Date(parseInt(stored));
  const end = new Date();
  end.setDate(end.getDate() + 3);
  localStorage.setItem('ab_end', end.getTime().toString());
  return end;
}

function updateCountdown() {
  // Null-safe: the countdown block may not exist on every page (e.g. simplified
  // homepage). Bail out cleanly instead of throwing and halting the whole script.
  const cdD = document.getElementById('cd-d');
  const cdH = document.getElementById('cd-h');
  const cdM = document.getElementById('cd-m');
  const cdS = document.getElementById('cd-s');
  if (!cdD || !cdH || !cdM || !cdS) return;

  const endDate = getEndDate();
  const now = new Date();
  const diff = endDate - now;

  const fmt = v => String(v).padStart(2, '0');
  if (diff <= 0) {
    cdD.textContent = cdH.textContent = cdM.textContent = cdS.textContent = '00';
    return;
  }

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  cdD.textContent = fmt(days);
  cdH.textContent = fmt(hours);
  cdM.textContent = fmt(minutes);
  cdS.textContent = fmt(seconds);
}

if (document.getElementById('cd-d')) {
  setInterval(updateCountdown, 1000);
  updateCountdown();
}

// --- PROGRESS BAR ANIMATION ---
function animateProgressBar() {
  const bar = document.querySelector('.progress-fill');
  if (!bar) return;
  const target = bar.dataset.target || '73';
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      /* The bar is full-width and scaled down; scaling up composites instead of
         relayouting the track. `target` stays a percentage in the markup. */
      bar.style.transform = 'scaleX(' + (parseFloat(target) / 100) + ')';
      io.disconnect();
    }
  }, { threshold: 0.5 });
  io.observe(bar);
}
animateProgressBar();

// --- ONE-SHOT ARROW NUDGE ---
// The arrow used to bounce forever; it now nudges twice when it scrolls in.
document.querySelectorAll('.solution-arrow').forEach(arrow => {
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      arrow.classList.add('is-in');
      io.disconnect();
    }
  }, { threshold: 0.6 });
  io.observe(arrow);
});

// --- FAQ ACCORDION ---
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    // Re-open if was closed
    if (!wasOpen) item.classList.add('open');
  });
});

// --- SMOOTH SCROLL ---
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// --- COUNTER ANIMATION ---
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const duration = 1500;
      const step = target / (duration / 16);
      let current = 0;
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = prefix + (Number.isInteger(target) ? Math.floor(current) : current.toFixed(1)) + suffix;
        if (current >= target) clearInterval(interval);
      }, 16);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => io.observe(c));
}
animateCounters();

// --- TYPING ANIMATION for hero tagline ---
function typeWriter(el, text, speed = 45) {
  let i = 0;
  el.textContent = '';
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i++);
      setTimeout(type, speed);
    }
  }
  type();
}

const tagEl = document.getElementById('hero-tagline');
if (tagEl) {
  setTimeout(() => typeWriter(tagEl, tagEl.dataset.text, 40), 800);
}

// --- MOCK LIVE FEED ---
const feedMessages = [
  '✅ @sophie_b vient de publier sur Instagram',
  '✅ @marc_digital a planifié 7 posts pour la semaine',
  '🔥 @agence_nova +1 240 followers ce mois',
  '✅ @freelance_paris vient de publier sur LinkedIn',
  '⚡ @coach_biz a généré 3 posts IA en 8 secondes',
  '✅ @ecom_store vient de publier sur Facebook',
];

const liveFeed = document.getElementById('live-feed');
if (liveFeed) {
  let fi = 0;
  function showNextFeed() {
    const msg = document.createElement('div');
    msg.className = 'feed-msg';
    msg.style.cssText = 'font-size:0.78rem;color:#71717a;padding:4px 0;opacity:0;transition:opacity 0.5s';
    msg.textContent = feedMessages[fi % feedMessages.length];
    liveFeed.insertBefore(msg, liveFeed.firstChild);
    setTimeout(() => { msg.style.opacity = '1'; }, 50);
    if (liveFeed.children.length > 3) {
      const last = liveFeed.lastChild;
      last.style.opacity = '0';
      setTimeout(() => last.remove(), 500);
    }
    fi++;
    setTimeout(showNextFeed, 3000);
  }
  setTimeout(showNextFeed, 2000);
}
