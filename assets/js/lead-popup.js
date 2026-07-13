/* Lead capture popup for resource pages.
   Posts { email, source, page, date } to the n8n webhook, which upserts
   into the LeadsAutoBoost data table (dedupe on email). */
(function () {
  var WEBHOOK = 'https://n7n.automatisationboost.com/webhook/Form-lead-autoboost';
  var DONE_KEY = 'ab_lead_done';
  var DELAY_MS = 12000;
  var SCROLL_RATIO = 0.35;

  if (localStorage.getItem(DONE_KEY)) return;

  var overlay = document.createElement('div');
  overlay.id = 'leadOverlay';
  overlay.style.cssText =
    'display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.82);' +
    'backdrop-filter:blur(8px);align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = [
    '<div style="background:#0d0d0d;border:1px solid rgba(234,179,8,0.35);border-radius:16px;',
    'padding:40px 32px;max-width:440px;width:100%;box-shadow:0 0 60px rgba(234,179,8,0.15),0 0 0 1px rgba(234,179,8,0.08);',
    'text-align:center;position:relative;animation:abPopIn .35s cubic-bezier(0.4,0,0.2,1);">',
    '<button type="button" id="leadClose" aria-label="Fermer" style="position:absolute;top:12px;right:14px;',
    'background:none;border:none;color:#52525b;font-size:1.4rem;line-height:1;cursor:pointer;padding:4px;">&times;</button>',
    '<div style="font-size:2.2rem;margin-bottom:12px;">&#9889;</div>',
    '<div style="display:inline-block;background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.25);',
    'color:#eab308;font-family:\'Space Grotesk\',sans-serif;font-size:10px;font-weight:700;padding:4px 12px;',
    'border-radius:4px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;">ACC&Egrave;S GRATUIT</div>',
    '<h2 style="font-family:\'Space Grotesk\',sans-serif;font-size:clamp(1.2rem,4vw,1.6rem);font-weight:900;',
    'color:#e4e4e7;line-height:1.2;letter-spacing:-0.03em;margin-bottom:10px;">Re&ccedil;ois nos workflows n8n<br>',
    '<span style="color:#eab308;">offerts chaque semaine</span></h2>',
    '<p style="font-family:\'Inter\',sans-serif;font-size:.9rem;color:#71717a;line-height:1.6;margin-bottom:24px;">',
    'Entre ton email pour recevoir les nouvelles ressources et workflows en avant-premi&egrave;re.</p>',
    '<form id="leadForm">',
    '<input id="leadEmail" type="email" placeholder="ton@email.com" required autocomplete="email" ',
    'style="width:100%;background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:13px 16px;color:#e4e4e7;',
    'font-family:\'Inter\',sans-serif;font-size:.95rem;margin-bottom:10px;outline:none;box-sizing:border-box;" />',
    '<button type="submit" id="leadBtn" style="width:100%;background:#eab308;color:#000;',
    'font-family:\'Space Grotesk\',sans-serif;font-size:.85rem;font-weight:700;padding:14px;border:none;',
    'border-radius:8px;cursor:pointer;letter-spacing:.04em;text-transform:uppercase;margin-bottom:12px;">',
    '&#128640; Recevoir les ressources</button>',
    '</form>',
    '<div id="leadSuccess" style="display:none;padding:16px 0;">',
    '<div style="font-size:2rem;margin-bottom:8px;">&#9989;</div>',
    '<p style="font-family:\'Inter\',sans-serif;color:#22c55e;font-weight:600;font-size:.95rem;margin:0;">',
    'C\'est parti ! V&eacute;rifie ta bo&icirc;te mail.</p></div>',
    '<p style="font-size:.72rem;color:#3f3f46;font-family:\'Inter\',sans-serif;margin:0;">',
    'Pas de spam. D&eacute;sinscription en 1 clic.</p>',
    '</div>'
  ].join('');

  var style = document.createElement('style');
  style.textContent = '@keyframes abPopIn{from{opacity:0;transform:scale(0.92) translateY(16px);}to{opacity:1;transform:scale(1) translateY(0);}}';

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  var shown = false;
  function show() {
    if (shown || localStorage.getItem(DONE_KEY)) return;
    shown = true;
    overlay.style.display = 'flex';
  }
  function dismiss() {
    overlay.style.display = 'none';
    localStorage.setItem(DONE_KEY, '1');
  }

  setTimeout(show, DELAY_MS);
  window.addEventListener('scroll', function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max > 0 && window.scrollY / max > SCROLL_RATIO) show();
  }, { passive: true });

  document.getElementById('leadClose').addEventListener('click', dismiss);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) dismiss();
  });

  document.getElementById('leadForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = document.getElementById('leadBtn');
    var email = document.getElementById('leadEmail').value.trim();

    btn.disabled = true;
    btn.textContent = 'Envoi…';
    btn.style.opacity = '0.7';

    try {
      await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          source: 'popup-ressource',
          page: window.location.pathname,
          date: new Date().toISOString()
        })
      });
    } catch (_) {}

    localStorage.setItem(DONE_KEY, '1');
    document.getElementById('leadForm').style.display = 'none';
    document.getElementById('leadSuccess').style.display = 'block';
    setTimeout(function () { overlay.style.display = 'none'; }, 2200);
  });
})();
