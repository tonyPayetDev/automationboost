/* Lead capture gate for resource pages.
   Blocking: no close button and no dismiss until name + email are submitted.
   Posts { name, email, source, page, date } to the n8n webhook, which upserts
   into the LeadsAutoBoost data table (dedupe on email).

   2026-08-29 : l'envoi est branché. Kg00I9SqHQsNsV9x fait désormais
   webhook -> table de données -> Brevo, et le mail part réellement (vérifié :
   messageId renvoyé par smtp-relay.mailin.fr). Le message de succès mentionne
   donc l'email — c'est vrai maintenant.

   ⚠️ Reste faux : le titre du mur promet des « workflows n8n offerts chaque
   semaine ». Aucun envoi hebdomadaire n'existe. Soit on le construit, soit on
   change ce titre — mais on ne laisse pas la promesse en l'état. */
(function () {
  var WEBHOOK = 'https://n7n.automatisationboost.com/webhook/Form-lead-autoboost';
  var LEAD_KEY = 'ab_lead_email';

  /* ============================================================
     Email typo detection — shared with journal-ia forms.
     Returns { hasTypo: true, suggestion: 'corrected@domain.com', original: '...' }
     or { hasTypo: false } if no obvious typo.
     Never blocks syntactically valid unknown domains.
     ============================================================ */
  window.abDetectEmailTypo = function (email) {
    email = String(email == null ? '' : email).trim();

    /* Espaces et doubles @ : la correction est mécanique, il n'y a rien à deviner.
       On normalise puis on relance la détection sur le résultat (« tony @ gmial.com »
       devient « tony@gmial.com », puis la faute de domaine est traitée normalement). */
    var cleaned = email.replace(/\s+/g, '').replace(/@+/g, '@').replace(/^@/, '').replace(/@$/, '');
    if (cleaned !== email) {
      var nested = window.abDetectEmailTypo(cleaned);
      if (nested.hasTypo) return { hasTypo: true, suggestion: nested.suggestion, original: email };
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        return { hasTypo: true, suggestion: cleaned, original: email };
      }
      return { hasTypo: false };
    }

    var at = email.indexOf('@');
    if (at <= 0 || at === email.length - 1) return { hasTypo: false };
    var local = email.slice(0, at);
    var domain = email.slice(at + 1).toLowerCase();

    /* Les vrais fournisseurs, avec la correction attendue. */
    var providers = {
      'gmail': 'gmail.com', 'yahoo': 'yahoo.com', 'hotmail': 'hotmail.com',
      'outlook': 'outlook.com', 'icloud': 'icloud.com', 'live': 'live.com',
      'msn': 'msn.com', 'orange': 'orange.fr', 'laposte': 'laposte.net',
      'free': 'free.fr', 'sfr': 'sfr.fr', 'wanadoo': 'wanadoo.fr', 'bbox': 'bbox.fr'
    };

    var typoMap = {
      'gmial': 'gmail.com', 'gmai': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com',
      'gmil': 'gmail.com', 'gmal': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com',
      'gmaill': 'gmail.com', 'gnail': 'gmail.com', 'gmeil': 'gmail.com',
      'yaho': 'yahoo.com', 'yahooo': 'yahoo.com', 'yahho': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.co': 'yahoo.com',
      'yahool': 'yahoo.com', 'yaho.com': 'yahoo.com',
      'hotmial': 'hotmail.com', 'hotmai': 'hotmail.com', 'hotmal': 'hotmail.com', 'hotmali': 'hotmail.com',
      'hotmail.con': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmaill': 'hotmail.com',
      'outlok': 'outlook.com', 'outloo': 'outlook.com', 'outloook': 'outlook.com', 'outlook.con': 'outlook.com', 'outlook.co': 'outlook.com',
      'outlok.com': 'outlook.com', 'outlookk': 'outlook.com',
      'freee': 'free.fr', 'freee.fr': 'free.fr', 'free.con': 'free.fr', 'free.co': 'free.fr',
      'francesse': 'free.fr', 'franceese': 'free.fr', 'francese': 'free.fr',
      'sfr.con': 'sfr.fr', 'sfrr': 'sfr.fr', 'sfr.co': 'sfr.fr',
      'iclod': 'icloud.com', 'icoud': 'icloud.com', 'iclou': 'icloud.com', 'iclud': 'icloud.com',
      'icloud.con': 'icloud.com', 'icloud.co': 'icloud.com',
      'live.con': 'live.com', 'live.co': 'live.com', 'livee': 'live.com',
      'msn.con': 'msn.com', 'msn.co': 'msn.com',
      'orannge': 'orange.fr', 'orang': 'orange.fr', 'orange.con': 'orange.fr', 'orange.co': 'orange.fr',
      'lapost': 'laposte.net', 'laposte.con': 'laposte.net', 'laposte.co': 'laposte.net',
      'wanadoo.con': 'wanadoo.fr', 'wanadoo.co': 'wanadoo.fr',
      'bbox.con': 'bbox.fr', 'bbox.co': 'bbox.fr',
      'numericable.con': 'numericable.fr', 'numericable.co': 'numericable.fr'
    };

    /* Point manquant : « tony@gmailcom » → tony@gmail.com. */
    if (domain.indexOf('.') === -1) {
      for (var stem in providers) {
        if (domain === stem || domain === stem + 'com' || domain === stem + 'fr' || domain === stem + 'net') {
          return { hasTypo: true, suggestion: local + '@' + providers[stem], original: email };
        }
      }
      /* Faute de frappe ET point manquant : « tony@gmial » → tony@gmail.com. */
      if (typoMap[domain]) {
        return { hasTypo: true, suggestion: local + '@' + typoMap[domain], original: email };
      }
      return { hasTypo: false };
    }

    /* Point traînant : « tony@gmail.com. » */
    if (domain.charAt(domain.length - 1) === '.' &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(local + '@' + domain.slice(0, -1))) {
      return { hasTypo: true, suggestion: local + '@' + domain.slice(0, -1), original: email };
    }

    var parts = domain.split('.');
    var tld = parts.pop();
    var sld = parts.pop() || '';

    /* Fournisseur et extension inversés : « tony@fr.free » → tony@free.fr. */
    if (providers[tld] && parts.length === 0 && (sld === 'fr' || sld === 'com' || sld === 'net')) {
      return { hasTypo: true, suggestion: local + '@' + providers[tld], original: email };
    }

    var fullDomain = sld + '.' + tld;
    if (typoMap[fullDomain]) {
      return { hasTypo: true, suggestion: local + '@' + typoMap[fullDomain], original: email };
    }
    if (typoMap[sld] && (tld === 'com' || tld === 'fr')) {
      return { hasTypo: true, suggestion: local + '@' + typoMap[sld], original: email };
    }

    /* Extension fausse : « con » au lieu de « com » (« tony@gmail.con »). */
    if (tld === 'con') {
      return { hasTypo: true, suggestion: local + '@' + sld + '.com', original: email };
    }

    /* Domaine « collé » à un vrai fournisseur : « tony@toigmail.com ».
       Uniquement sur un domaine à deux labels et si le morceau ajouté fait
       4 caractères au plus — sinon on laisse passer (règle : jamais bloquer
       une adresse syntaxiquement correcte qu'on ne reconnaît pas). */
    if (parts.length === 0) {
      var lookalikes = ['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud'];
      for (var k = 0; k < lookalikes.length; k++) {
        var tok = lookalikes[k];
        var idx = sld.indexOf(tok);
        if (idx > 0 && idx + tok.length === sld.length && idx <= 4) {
          return { hasTypo: true, suggestion: local + '@' + providers[tok], original: email };
        }
      }
    }

    return { hasTypo: false };
  };

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

  /* Une page peut refuser le mur : il suffit qu'elle porte data-sans-mur sur
     <html> ou <body>. Utile quand la ressource a DEJA ete gagnee — quelqu'un
     qui a commente un mot-cle et recu le lien ne doit pas retrouver une porte
     fermee a l'arrivee. On lui laisse la lecture, et on lui propose de parler
     en bas de page plutot que de le bloquer en haut. */
  var r = document.documentElement, c = document.body;
  if ((r && r.hasAttribute('data-sans-mur')) || (c && c.hasAttribute('data-sans-mur'))) return;

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
    '<form id="leadForm" class="ab-fade" novalidate>',
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
    'C\'est bon ! Ta ressource est d&eacute;bloqu&eacute;e.</p>',
    '<p style="font-family:\'Inter\',sans-serif;color:#a1a1aa;font-size:.82rem;margin:0 0 16px;line-height:1.55;">',
    'Le lien vient aussi de partir par email, pour que tu le retrouves plus tard.</p>',
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

    /* La détection passe avant la regex : une faute évidente doit recevoir la
       proposition de correction, pas le message générique « adresse invalide ». */
    var typo = window.abDetectEmailTypo(email);
    if (typo.hasTypo) {
      err.innerHTML = 'Ça ressemble à une faute de frappe — voulais-tu dire <strong>' + typo.suggestion + '</strong> ? ' +
        '<button type="button" id="typoFix" style="background:#eab308;color:#000;border:none;border-radius:4px;padding:2px 8px;margin-left:8px;font-size:.75rem;font-weight:700;cursor:pointer;">Utiliser cette correction</button>';
      err.style.display = 'block';
      document.getElementById('leadEmail').focus();
      document.getElementById('typoFix').addEventListener('click', function () {
        document.getElementById('leadEmail').value = typo.suggestion;
        err.style.display = 'none';
        document.getElementById('leadEmail').focus();
      });
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
