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
  const endDate = getEndDate();
  const now = new Date();
  const diff = endDate - now;

  if (diff <= 0) {
    document.getElementById('cd-h').textContent = '00';
    document.getElementById('cd-m').textContent = '00';
    document.getElementById('cd-s').textContent = '00';
    document.getElementById('cd-d').textContent = '00';
    return;
  }

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const fmt = v => String(v).padStart(2, '0');
  document.getElementById('cd-d').textContent = fmt(days);
  document.getElementById('cd-h').textContent = fmt(hours);
  document.getElementById('cd-m').textContent = fmt(minutes);
  document.getElementById('cd-s').textContent = fmt(seconds);
}

setInterval(updateCountdown, 1000);
updateCountdown();

// --- PROGRESS BAR ANIMATION ---
function animateProgressBar() {
  const bar = document.querySelector('.progress-fill');
  if (!bar) return;
  const target = bar.dataset.target || '73';
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      bar.style.width = target + '%';
      io.disconnect();
    }
  }, { threshold: 0.5 });
  io.observe(bar);
}
animateProgressBar();

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
