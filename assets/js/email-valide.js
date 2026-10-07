/* email-valide.js — shared email check for every form on automatisationboost.com.

   Layer 1 of 3 (browser, instant). Layers 2 and 3 live in n8n:
   - webhook /webhook/email-valide (check only)  — used before posting a form,
   - webhook /webhook/Form-lead-autoboost        — checks again before saving.
   The server never trusts this file: it re-runs the same core plus a DNS check.

   What it does, with no friction for a real visitor:
   - trims, removes spaces, lowercases;
   - strict syntax;
   - suggests a fix for common domain typos (gmial.com -> gmail.com, .con -> .com),
     with a one-click "Oui, corriger" button; the visitor can keep the address;
   - refuses disposable domains (domaines-jetables.json, ~9 000 domains);
   - refuses obvious fake addresses (test@test.com, azerty@azerty.fr, aaa@gmail.com).

   It attaches itself to every <form> holding an input[type=email], via a submit
   listener in the capture phase, so it runs before the page's own handler and
   nothing has to be copied into the pages. A form can opt out of the server
   pre-check with data-email-serveur="non" (the lead gate does: its webhook
   already checks before saving).

   The block between CORE-START and CORE-END is pure ES5 and is copied verbatim
   into the n8n Code nodes by the build script — edit it here, then rebuild. */
(function (root) {
  'use strict';

  /* CORE-START */
  var CORE = (function () {
    /* Domains we know are real: never suggest a correction for them. */
    var CONNUS = [
      'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.fr', 'hotmail.be', 'hotmail.ca', 'hotmail.co.uk',
      'outlook.com', 'outlook.fr', 'outlook.be', 'live.com', 'live.fr', 'live.be', 'live.ca', 'msn.com',
      'yahoo.com', 'yahoo.fr', 'yahoo.ca', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
      'icloud.com', 'me.com', 'mac.com', 'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'neuf.fr',
      'laposte.net', 'bbox.fr', 'numericable.fr', 'club-internet.fr', 'aliceadsl.fr', 'cegetel.net',
      'gmx.fr', 'gmx.com', 'gmx.de', 'web.de', 'aol.com', 'aol.fr', 'protonmail.com', 'proton.me', 'pm.me',
      'mail.com', 'email.com', 'voila.fr', 'skynet.be', 'tutanota.com', 'zoho.com', 'yandex.com', 'mail.ru'
    ];
    /* The domains a typo gets corrected towards, most used first. */
    var CIBLES = [
      'gmail.com', 'hotmail.com', 'hotmail.fr', 'outlook.com', 'outlook.fr', 'yahoo.fr', 'yahoo.com',
      'icloud.com', 'orange.fr', 'live.fr', 'live.com', 'free.fr', 'sfr.fr', 'laposte.net', 'wanadoo.fr',
      'gmx.fr', 'msn.com', 'neuf.fr', 'bbox.fr', 'aol.com', 'protonmail.com', 'numericable.fr'
    ];
    /* Typos seen in real life. The server refuses these outright: several of them
       resolve (typosquatting), so the DNS check alone would let them through. */
    var FAUTES = {
      'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com',
      'gmil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmeil.com': 'gmail.com',
      'gmali.com': 'gmail.com', 'gmaul.com': 'gmail.com', 'gmzil.com': 'gmail.com', 'gimail.com': 'gmail.com',
      'gemail.com': 'gmail.com', 'gmail.fr': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com',
      'gmail.om': 'gmail.com', 'gmail.cim': 'gmail.com', 'gmail.vom': 'gmail.com', 'gmail.xom': 'gmail.com',
      'gmail.comm': 'gmail.com', 'gmail.cpm': 'gmail.com', 'gmail.cmo': 'gmail.com', 'gmail.ocm': 'gmail.com',
      'gmail.con': 'gmail.com', 'gmail.coom': 'gmail.com', 'gmail.re': 'gmail.com', 'gmaik.com': 'gmail.com',
      'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
      'hotamil.com': 'hotmail.com', 'homail.com': 'hotmail.com', 'hotmali.com': 'hotmail.com',
      'hotmaill.com': 'hotmail.com', 'hotmil.com': 'hotmail.com', 'hormail.com': 'hotmail.com',
      'hotmial.fr': 'hotmail.fr', 'hotmal.fr': 'hotmail.fr', 'hotmai.fr': 'hotmail.fr', 'hotamil.fr': 'hotmail.fr',
      'homail.fr': 'hotmail.fr', 'hotmali.fr': 'hotmail.fr', 'hotmil.fr': 'hotmail.fr', 'hormail.fr': 'hotmail.fr',
      'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outloo.com': 'outlook.com',
      'outloook.com': 'outlook.com', 'outlookk.com': 'outlook.com', 'outook.com': 'outlook.com',
      'outlok.fr': 'outlook.fr', 'outllok.fr': 'outlook.fr', 'outloo.fr': 'outlook.fr', 'outook.fr': 'outlook.fr',
      'yahou.fr': 'yahoo.fr', 'yaho.fr': 'yahoo.fr', 'yahooo.fr': 'yahoo.fr', 'yahho.fr': 'yahoo.fr',
      'yahou.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahho.com': 'yahoo.com',
      'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com', 'iclou.com': 'icloud.com', 'iclud.com': 'icloud.com',
      'icloud.fr': 'icloud.com', 'orage.fr': 'orange.fr', 'ornage.fr': 'orange.fr', 'orang.fr': 'orange.fr',
      'orannge.fr': 'orange.fr', 'oange.fr': 'orange.fr', 'wanado.fr': 'wanadoo.fr', 'wandoo.fr': 'wanadoo.fr',
      'lapost.net': 'laposte.net', 'laposte.fr': 'laposte.net', 'lapsote.net': 'laposte.net',
      'freee.fr': 'free.fr', 'fre.fr': 'free.fr', 'sfr.com': 'sfr.fr'
    };
    /* Extensions that do not exist but are one key away from a real one. */
    var EXT = { 'con': 'com', 'cpm': 'com', 'cmo': 'com', 'comm': 'com', 'vom': 'com', 'xom': 'com', 'ocm': 'com',
                'cim': 'com', 'coom': 'com', 'frr': 'fr', 'ffr': 'fr', 'rf': 'fr', 'fe': 'fr', 'ft': 'fr',
                'nett': 'net', 'ner': 'net', 'nte': 'net' };
    /* Placeholder / keyboard-smash addresses. */
    var DOMAINES_BIDON = [
      'example.com', 'example.org', 'example.net', 'example.fr', 'exemple.com', 'exemple.fr', 'test.com', 'test.fr',
      'test.test', 'testing.com', 'azerty.fr', 'azerty.com', 'qwerty.com', 'qwerty.fr', 'asdf.com', 'asdf.fr',
      'aaa.com', 'aaa.fr', 'toto.fr', 'toto.com', 'domain.com', 'domaine.fr', 'domaine.com', 'fake.com', 'fake.fr',
      'faux.fr', 'xxx.com', 'xxx.fr', 'bidon.fr', 'bidon.com', 'nomail.com', 'noemail.com', 'sansmail.fr',
      'email.fr', 'mail.fr', 'tonemail.com', 'monemail.com', 'monmail.fr', 'ton-entreprise.re'
    ];
    var LOCAUX_BIDON = [
      'test', 'tests', 'testing', 'testtest', 'azerty', 'azertyuiop', 'qwerty', 'asdf', 'asdfgh', 'qsdf', 'qsdfgh',
      'aze', 'azer', 'wxcv', 'abc', 'abcd', 'abcdef', 'toto', 'tata', 'titi', 'fake', 'faux', 'bidon', 'nom',
      'prenom', 'nomprenom', 'prenomnom', 'email', 'mail', 'monemail', 'tonemail', 'ton', 'toi', 'moi',
      'nobody', 'personne', 'no', 'non', 'nope', 'spam', 'null', 'none', 'aucun', 'rien', 'blabla', 'jsp'
    ];
    /* Domains where a fake local part is a give-away (webmail anyone can type). */
    var GENERIQUES = CONNUS;

    function contient(liste, v) { for (var i = 0; i < liste.length; i++) if (liste[i] === v) return true; return false; }

    function normaliser(email) {
      return String(email == null ? '' : email).replace(/[\s​ ]+/g, '').replace(/@+/g, '@').toLowerCase()
        .replace(/[.,;]+$/, '');
    }

    function syntaxeOk(email) {
      if (email.length > 254) return false;
      var at = email.lastIndexOf('@');
      if (at < 1 || email.indexOf('@') !== at) return false;
      var local = email.slice(0, at), domaine = email.slice(at + 1);
      if (local.length > 64) return false;
      if (!/^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/.test(local)) return false;
      var labels = domaine.split('.');
      if (labels.length < 2) return false;
      for (var i = 0; i < labels.length; i++) {
        if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(labels[i])) return false;
      }
      var tld = labels[labels.length - 1];
      return /^[a-z]{2,24}$/.test(tld) || /^xn--[a-z0-9-]{2,59}$/.test(tld);
    }

    /* Optimal string alignment distance (Levenshtein + transposition). */
    function distance(a, b) {
      var d = [], i, j;
      for (i = 0; i <= a.length; i++) { d[i] = [i]; }
      for (j = 0; j <= b.length; j++) { d[0][j] = j; }
      for (i = 1; i <= a.length; i++) {
        for (j = 1; j <= b.length; j++) {
          var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
          d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
          if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }

    /* Returns the corrected DOMAIN, or '' when nothing looks wrong. */
    function corrigerDomaine(domaine) {
      if (!domaine || contient(CONNUS, domaine)) return '';
      if (FAUTES[domaine]) return FAUTES[domaine];
      /* Missing dot: gmailcom, hotmailfr. */
      if (domaine.indexOf('.') === -1) {
        for (var k = 0; k < CIBLES.length; k++) {
          if (CIBLES[k].replace('.', '') === domaine) return CIBLES[k];
        }
        return FAUTES[domaine + '.com'] || '';
      }
      var p = domaine.lastIndexOf('.');
      var base = domaine.slice(0, p), ext = domaine.slice(p + 1);
      if (EXT[ext]) {
        var fixe = base + '.' + EXT[ext];
        return FAUTES[fixe] || fixe;
      }
      /* Close to a big provider: 1 edit, or 2 on a long name with the same extension. */
      var meilleur = '', best = 99;
      for (var i = 0; i < CIBLES.length; i++) {
        var c = CIBLES[i], dd = distance(domaine, c);
        var ext2 = c.slice(c.lastIndexOf('.') + 1);
        var seuil = (ext2 === ext && base.length >= 6) ? 2 : 1;
        if (dd <= seuil && dd < best) { best = dd; meilleur = c; }
      }
      return meilleur;
    }

    function jetable(domaine, liste) {
      if (!liste) return false;
      var parts = domaine.split('.');
      for (var i = 0; i < parts.length - 1; i++) {
        if (liste[parts.slice(i).join('.')]) return true;
      }
      return false;
    }

    function bidon(local, domaine) {
      if (contient(DOMAINES_BIDON, domaine)) return true;
      var racine = domaine.split('.')[0];
      var l = local.replace(/[0-9._-]+$/, '');
      if (local === racine && local.length <= 6) return true;            /* aaa@aaa.fr, toto@toto.com */
      if (!contient(GENERIQUES, domaine)) return false;                   /* a company's own domain: trust it */
      if (contient(LOCAUX_BIDON, l)) return true;                        /* test@gmail.com, azerty1@hotmail.fr */
      if (/^(.)\1+$/.test(l) || /^[0-9]+$/.test(local)) return true;     /* aaa@, xxxx@, 12345@ */
      if (local.length < 2) return true;                                 /* a@gmail.com */
      return false;
    }

    /* Full local check. listeJetables: object { domain: 1 } or null. */
    function verifier(brut, listeJetables) {
      var email = normaliser(brut);
      if (!email) return { ok: false, raison: 'vide', email: email };
      var at = email.lastIndexOf('@');
      var domaine = at > 0 ? email.slice(at + 1) : '';
      var local = at > 0 ? email.slice(0, at) : email;
      var corr = corrigerDomaine(domaine.replace(/\.+$/, ''));
      var suggestion = corr ? local + '@' + corr : '';
      if (suggestion && !syntaxeOk(suggestion)) suggestion = '';
      if (!syntaxeOk(email)) {
        return suggestion ? { ok: false, raison: 'faute_de_frappe', suggestion: suggestion, email: email }
                          : { ok: false, raison: 'syntaxe', email: email };
      }
      /* A known typo first: some typo domains are also listed as throwaway. */
      if (FAUTES[domaine]) return { ok: false, raison: 'faute_de_frappe', suggestion: suggestion, email: email, certain: true };
      if (jetable(domaine, listeJetables)) return { ok: false, raison: 'jetable', email: email };
      if (bidon(local, domaine)) return { ok: false, raison: 'bidon', email: email };
      if (suggestion) {
        /* FAUTES entries are certain; a distance match is only a question. */
        return { ok: false, raison: 'faute_de_frappe', suggestion: suggestion, email: email,
                 certain: !!FAUTES[domaine] || !!EXT[domaine.slice(domaine.lastIndexOf('.') + 1)] };
      }
      return { ok: true, email: email };
    }

    return { normaliser: normaliser, syntaxeOk: syntaxeOk, corrigerDomaine: corrigerDomaine,
             jetable: jetable, bidon: bidon, verifier: verifier, FAUTES: FAUTES };
  })();
  /* CORE-END */

  if (typeof module !== 'undefined' && module.exports) { module.exports = CORE; }
  if (typeof document === 'undefined') return;
  if (root.abEmail) return;

  var SCRIPT = document.currentScript;
  var BASE = (SCRIPT && SCRIPT.src) ? SCRIPT.src.replace(/[^\/]*$/, '') : '/assets/js/';
  var ENDPOINT = 'https://n7n.automatisationboost.com/webhook/email-valide';

  /* Small built-in list so the most common throwaway domains are caught even
     before (or without) the full JSON. */
  var jetables = {};
  ['mailinator.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net', '10minutemail.com', 'guerrillamail.com',
   'guerrillamail.net', 'sharklasers.com', 'temp-mail.org', 'tempmail.net', 'trashmail.com', 'trashmail.fr',
   'jetable.org', 'getnada.com', 'maildrop.cc', 'dispostable.com', 'throwawaymail.com', 'fakeinbox.com',
   'mailnesia.com', 'mintemail.com', 'mohmal.com', 'emailondeck.com', 'tempail.com', 'spamgourmet.com',
   'mytemp.email', 'tempr.email', 'discard.email', 'mailcatch.com', 'moakt.com', 'burnermail.io'
  ].forEach(function (d) { jetables[d] = 1; });
  var chargement = null;
  function chargerJetables() {
    if (chargement) return chargement;
    chargement = fetch(BASE + 'domaines-jetables.json?v=20261007a', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (liste) { (liste || []).forEach(function (d) { jetables[d] = 1; }); })
      .catch(function () {});
    return chargement;
  }

  var MESSAGES = {
    vide: 'Entre ton adresse email pour continuer.',
    syntaxe: 'Cette adresse email n’est pas valide. Vérifie-la (exemple : prenom@gmail.com).',
    jetable: 'Les adresses email temporaires ne sont pas acceptées. Utilise ton adresse habituelle.',
    bidon: 'Cette adresse ressemble à une adresse de test. Entre ta vraie adresse pour recevoir la ressource.',
    domaine_inexistant: 'Ce domaine ne reçoit pas d’emails. Vérifie ce qui est écrit après le @.',
    faute_de_frappe: 'Cette adresse contient une faute de frappe.',
    trop_de_tentatives: 'Trop d’essais d’affilée. Patiente une minute puis réessaie.'
  };

  /* The message area sits right under the field and is announced by screen readers. */
  function zone(input) {
    var id = (input.id || input.name || 'email') + '-ab-msg';
    var el = input.form && input.form.querySelector('[data-ab-email-msg]');
    if (!el) el = document.getElementById(id);
    if (!el) {
      el = document.createElement('p');
      el.id = id;
      el.setAttribute('data-ab-email-msg', '');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'display:none;margin:4px 0 10px;font-size:.82rem;line-height:1.45;text-align:left;' +
        'color:#f87171;font-family:Inter,system-ui,sans-serif;';
      var apres = input.parentNode && input.parentNode.tagName === 'LABEL' ? input.parentNode : input;
      apres.parentNode.insertBefore(el, apres.nextSibling);
    }
    input.setAttribute('aria-describedby', el.id);
    return el;
  }

  function effacer(input) {
    var el = zone(input);
    while (el.firstChild) el.removeChild(el.firstChild);
    el.style.display = 'none';
    input.removeAttribute('aria-invalid');
  }

  /* Shows a refusal or a suggestion. Built with DOM nodes: the text echoes what
     the visitor typed. */
  function afficher(input, res, garder) {
    var el = zone(input);
    while (el.firstChild) el.removeChild(el.firstChild);
    if (res.suggestion) {
      el.appendChild(document.createTextNode('Tu voulais écrire '));
      var b = document.createElement('strong');
      b.textContent = res.suggestion;
      el.appendChild(b);
      el.appendChild(document.createTextNode(' ? '));
      var oui = document.createElement('button');
      oui.type = 'button';
      oui.textContent = 'Oui, corriger';
      oui.style.cssText = 'background:#eab308;color:#000;border:0;border-radius:4px;padding:3px 10px;margin:2px 6px 0 2px;' +
        'font-size:.78rem;font-weight:700;cursor:pointer;';
      oui.addEventListener('click', function () {
        input.value = res.suggestion;
        effacer(input);
        input.focus();
      });
      el.appendChild(oui);
      if (garder) {
        var non = document.createElement('button');
        non.type = 'button';
        non.textContent = 'Non, garder mon adresse';
        non.style.cssText = 'background:none;border:0;color:inherit;opacity:.75;text-decoration:underline;' +
          'font-size:.75rem;cursor:pointer;padding:3px 0;';
        non.addEventListener('click', function () {
          gardees[res.email] = 1;
          effacer(input);
          input.focus();
        });
        el.appendChild(non);
      }
    } else {
      el.textContent = MESSAGES[res.raison] || MESSAGES.syntaxe;
    }
    el.style.color = res.suggestion ? '#facc15' : '#f87171';   /* a question, not an error */
    el.style.display = 'block';
    el.setAttribute('data-pour', input.value);
    input.setAttribute('aria-invalid', 'true');
  }

  /* Addresses for which the visitor refused our (uncertain) correction. */
  var gardees = {};

  /* Local check. Returns the same shape as the server. */
  function verifier(brut) {
    var r = CORE.verifier(brut, jetables);
    if (r.raison === 'faute_de_frappe' && !r.certain && gardees[r.email] && CORE.syntaxeOk(r.email)) {
      return { ok: true, email: r.email };
    }
    return r;
  }

  /* Server check, never blocking on failure: no answer in 4 s = accepted. */
  function verifierServeur(email) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    return fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, page: location.pathname }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.ok ? r.json() : { ok: true }; })
      .then(function (j) { return (j && j.ok === false && j.raison) ? j : { ok: true }; })
      .catch(function () { return { ok: true }; })
      .then(function (j) { clearTimeout(t); return j; });
  }

  function champ(form) { return form && form.querySelector && form.querySelector('input[type="email"]'); }

  var passe = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

  /* Capture phase on document: runs before the form's own submit handler. */
  document.addEventListener('submit', function (e) {
    var form = e.target, input = champ(form);
    if (!input) return;
    if (passe && passe.has(form)) { passe.delete(form); return; }
    var r = verifier(input.value);
    if (!r.ok) {
      e.preventDefault();
      e.stopImmediatePropagation();
      afficher(input, r, r.raison === 'faute_de_frappe' && !r.certain);
      input.focus();
      return;
    }
    input.value = r.email;
    effacer(input);
    if (form.getAttribute('data-email-serveur') === 'non' || !passe || !form.requestSubmit) return;
    /* Ask the server (DNS), then submit again for real. */
    e.preventDefault();
    e.stopImmediatePropagation();
    var btn = form.querySelector('button[type="submit"],button:not([type])');
    if (btn) btn.setAttribute('aria-busy', 'true');
    verifierServeur(r.email).then(function (s) {
      if (btn) btn.removeAttribute('aria-busy');
      if (s.ok === false) { afficher(input, s, false); input.focus(); return; }
      passe.add(form);
      form.requestSubmit(btn || undefined);
    });
  }, true);

  /* Gentle hint on blur for a typo; errors only show on submit. */
  document.addEventListener('focusout', function (e) {
    var input = e.target;
    if (!input || input.type !== 'email' || !input.value) return;
    /* Focus leaving for our own buttons: re-rendering now would swap the button
       under the pointer and swallow the click. */
    var z = zone(input);
    if (e.relatedTarget && z.contains(e.relatedTarget)) return;
    if (z.style.display !== 'none' && z.getAttribute('data-pour') === input.value) return;
    var r = verifier(input.value);
    if (r.raison === 'faute_de_frappe') afficher(input, r, !r.certain);
  }, true);
  document.addEventListener('input', function (e) {
    if (e.target && e.target.type === 'email') effacer(e.target);
  }, true);
  document.addEventListener('focusin', function (e) {
    if (e.target && e.target.type === 'email') chargerJetables();
  }, true);

  root.abEmail = { verifier: verifier, verifierServeur: verifierServeur, afficher: afficher, effacer: effacer,
                   messages: MESSAGES, chargerJetables: chargerJetables, core: CORE };
})(typeof window !== 'undefined' ? window : this);
