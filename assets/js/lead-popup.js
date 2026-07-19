/* Lead capture gate for resource pages.
   Blocking: no close button and no dismiss until name + email are submitted.
   Posts { name, email, source, page, date } to the n8n webhook, which upserts
   into the LeadsAutoBoost data table (dedupe on email). */
(function () {
  var WEBHOOK = 'https://n7n.automatisationboost.com/webhook/Form-lead-autoboost';
  var LEAD_KEY = 'ab_lead_email';

  /* Crawlers render the page without the gate: search engines index the resource,
     and link previews (shares) still show it. Google treats this as cloaking unless
     the paywalled content is declared with isAccessibleForFree structured data. */
  var CRAWLERS = new RegExp([
    'googlebot', 'google-inspectiontool', 'adsbot-google', 'storebot-google',
    'mediapartners-google', 'google-extended', 'apis-google', 'feedfetcher-google',
    'bingbot', 'bingpreview', 'duckduckbot', 'slurp', 'baiduspider', 'yandexbot',
    'applebot', 'petalbot', 'facebookexternalhit', 'facebot', 'twitterbot',
    'linkedinbot', 'whatsapp', 'telegrambot', 'discordbot', 'slackbot', 'pinterest'
  ].join('|'), 'i');
  if (CRAWLERS.test(navigator.userAgent)) return;

  if (localStorage.getItem(LEAD_KEY)) return;

  var overlay = document.createElement('div');
  overlay.id = 'leadOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'leadTitle');
  overlay.style.cssText =
    'display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.82);' +
    'backdrop-filter:blur(8px);align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = [
    '<div style="background:#0d0d0d;border:1px solid rgba(234,179,8,0.35);border-radius:16px;',
    'padding:40px 32px;max-width:440px;width:100%;box-shadow:0 0 60px rgba(234,179,8,0.15),0 0 0 1px rgba(234,179,8,0.08);',
    'text-align:center;position:relative;" id="leadCard" class="ab-card">',
    '<div style="font-size:2.2rem;margin-bottom:12px;">&#9889;</div>',
    '<div style="display:inline-block;background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.25);',
    'color:#eab308;font-family:\'Space Grotesk\',sans-serif;font-size:10px;font-weight:700;padding:4px 12px;',
    'border-radius:4px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;">ACC&Egrave;S GRATUIT</div>',
    '<h2 id="leadTitle" style="font-family:\'Space Grotesk\',sans-serif;font-size:clamp(1.2rem,4vw,1.6rem);font-weight:900;',
    'color:#e4e4e7;line-height:1.2;letter-spacing:-0.03em;margin-bottom:10px;">Re&ccedil;ois nos workflows n8n<br>',
    '<span style="color:#eab308;">offerts chaque semaine</span></h2>',
    '<p style="font-family:\'Inter\',sans-serif;font-size:.9rem;color:#71717a;line-height:1.6;margin-bottom:24px;">',
    'Entre ton pr&eacute;nom et ton email pour d&eacute;bloquer cette ressource et recevoir les prochaines en avant-premi&egrave;re.</p>',
    '<form id="leadForm" class="ab-fade">',
    '<input id="leadName" type="text" placeholder="Ton pr&eacute;nom" required minlength="2" autocomplete="given-name" ',
    'style="width:100%;background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:13px 16px;color:#e4e4e7;',
    'font-family:\'Inter\',sans-serif;font-size:.95rem;margin-bottom:10px;outline:none;box-sizing:border-box;" />',
    '<input id="leadEmail" type="email" placeholder="ton@email.com" required autocomplete="email" ',
    'style="width:100%;background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:13px 16px;color:#e4e4e7;',
    'font-family:\'Inter\',sans-serif;font-size:.95rem;margin-bottom:10px;outline:none;box-sizing:border-box;" />',
    '<p id="leadError" role="alert" style="display:none;font-family:\'Inter\',sans-serif;font-size:.8rem;color:#ef4444;',
    'margin:0 0 10px;text-align:left;"></p>',
    '<button type="submit" id="leadBtn" style="width:100%;background:#eab308;color:#000;',
    'font-family:\'Space Grotesk\',sans-serif;font-size:.85rem;font-weight:700;padding:14px;border:none;',
    'border-radius:8px;cursor:pointer;letter-spacing:.04em;text-transform:uppercase;margin-bottom:12px;">',
    '&#128640; D&eacute;bloquer la ressource</button>',
    '</form>',
    '<div id="leadSuccess" class="ab-fade" style="display:none;opacity:0;padding:16px 0;">',
    '<div style="font-size:2rem;margin-bottom:8px;">&#9989;</div>',
    '<p style="font-family:\'Inter\',sans-serif;color:#22c55e;font-weight:600;font-size:.95rem;margin:0 0 16px;">',
    'C\'est parti ! V&eacute;rifie ta bo&icirc;te mail.</p>',
    '<button type="button" id="leadClose" style="background:none;border:1px solid #2a2a2a;border-radius:8px;',
    'color:#a1a1aa;font-family:\'Inter\',sans-serif;font-size:.85rem;padding:10px 20px;cursor:pointer;">',
    'Acc&eacute;der &agrave; la ressource</button></div>',
    '<p style="font-size:.72rem;color:#3f3f46;font-family:\'Inter\',sans-serif;margin:0;">',
    'Pas de spam. D&eacute;sinscription en 1 clic.</p>',
    '</div>'
  ].join('');

  /* Enter, exit and the form→success swap. The exit is deliberately shorter and
     smaller than the enter — an exit as loud as its entrance reads as a glitch. */
  var style = document.createElement('style');
  style.textContent = [
    '#leadOverlay{opacity:1;transition:opacity .2s ease;}',
    '#leadOverlay.ab-leaving{opacity:0;}',
    '.ab-card{transition:opacity .2s ease,transform .2s cubic-bezier(0.4,0,1,1);}',
    '#leadOverlay.ab-leaving .ab-card{opacity:0;transform:scale(0.97) translateY(6px);}',
    '.ab-fade{transition:opacity .18s ease;}',
    '@media (prefers-reduced-motion: no-preference){',
    '  .ab-card{animation:abPopIn .35s cubic-bezier(0.4,0,0.2,1);}',
    '  @keyframes abPopIn{from{opacity:0;transform:scale(0.92) translateY(16px);}',
    '  to{opacity:1;transform:scale(1) translateY(0);}}',
    '}'
  ].join('');

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  var shown = false;
  var unlocked = false;
  var scrollY = 0;

  /* Lock the page behind the gate: position:fixed survives touch scrolling on iOS,
     which overflow:hidden alone does not. */
  function lockScroll() {
    scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = -scrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
  }
  function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollY);
  }

  function show() {
    if (shown || localStorage.getItem(LEAD_KEY)) return;
    shown = true;
    overlay.style.display = 'flex';
    lockScroll();
    document.getElementById('leadName').focus();
  }
  function close() {
    /* Play the exit, then remove from flow. The timeout is the transition
       duration plus a small margin, so the gate never gets stuck visible if
       transitionend does not fire (reduced motion, backgrounded tab). */
    overlay.classList.add('ab-leaving');
    setTimeout(function () {
      overlay.style.display = 'none';
      overlay.classList.remove('ab-leaving');
      unlockScroll();
    }, 220);
  }

  show();

  /* Keep focus inside the gate so the page behind stays unreachable by keyboard. */
  document.addEventListener('focusin', function (e) {
    if (!shown || unlocked) return;
    if (!overlay.contains(e.target)) {
      e.stopPropagation();
      document.getElementById('leadName').focus();
    }
  });

  document.getElementById('leadClose').addEventListener('click', close);

  document.getElementById('leadForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = document.getElementById('leadBtn');
    var err = document.getElementById('leadError');
    var name = document.getElementById('leadName').value.trim();
    var email = document.getElementById('leadEmail').value.trim();

    if (name.length < 2) {
      err.textContent = 'Entre ton prénom pour continuer.';
      err.style.display = 'block';
      document.getElementById('leadName').focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.textContent = 'Entre une adresse email valide pour continuer.';
      err.style.display = 'block';
      document.getElementById('leadEmail').focus();
      return;
    }
    err.style.display = 'none';

    btn.disabled = true;
    btn.textContent = 'Envoi…';
    btn.style.opacity = '0.7';

    try {
      await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          source: 'popup-ressource',
          page: window.location.pathname,
          date: new Date().toISOString()
        })
      });
    } catch (_) {}

    unlocked = true;
    localStorage.setItem(LEAD_KEY, email);

    /* Crossfade rather than swap: the user just handed over their email, and a
       hard cut is the one moment on the site where polish is worth the most. */
    var form = document.getElementById('leadForm');
    var success = document.getElementById('leadSuccess');
    form.style.opacity = '0';
    setTimeout(function () {
      form.style.display = 'none';
      success.style.display = 'block';
      /* Next frame, so the browser registers display:block before opacity moves. */
      requestAnimationFrame(function () { success.style.opacity = '1'; });
      document.getElementById('leadClose').focus();
    }, 180);

    setTimeout(close, 2600);
  });
})();
