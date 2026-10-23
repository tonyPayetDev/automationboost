/* AutomationBoost — Moteur de DÉFIS (validation par livrable)
   ------------------------------------------------------------------
   Remplace le QCM de mémorisation par un défi concret : l'élève produit
   un livrable réel (offre chiffrée, liste de prospects, JSON n8n, script
   vidéo, plan chiffré…), le colle dans le formulaire, et un auto-scoring
   objectif vérifie des critères mesurables côté navigateur.

   100 % front. Aucun backend. Les livrables sont sauvegardés en
   localStorage et exportables (page mon-rendu.html) pour que Tony puisse
   les relire et valider "pour de vrai".

   Dépend de cours.js (objet AB).
*/
(function () {
  if (!window.AB) { console.warn('[defi] cours.js doit être chargé avant defi.js'); return; }

  const LIVRABLES_KEY = 'ab_cours_livrables';

  // ── Normalisation FR (minuscules, sans accents) ────────────────────────
  function norm(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
  // Compte les mots comme le ferait un traitement de texte : on garde les
  // jetons d'une seule lettre ou d'un seul chiffre (« à », « a », « 2 »),
  // sinon le comptage sous-estime nettement un texte français ou chiffré —
  // et le calibrage vocal du module 5 devient faux.
  function words(s) {
    return norm(s).split(/[^a-z0-9€%'-]+/).filter(w => w.length > 0 && /[a-z0-9€%]/.test(w));
  }
  function lines(s) {
    return (s || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  }

  // ── Bibliothèque de tests objectifs ────────────────────────────────────
  // Chaque test renvoie true/false. Aucun test ne juge le "goût" : uniquement
  // du mesurable (longueur, présence, format, structure, unicité).
  const TESTS = {
    minMots:      (v, n) => words(v).length >= n,
    maxMots:      (v, n) => words(v).length <= n,
    minCaracteres:(v, n) => (v || '').trim().length >= n,

    // Tous les termes présents (chaque terme peut être "a|b|c" = synonymes)
    contientTous: (v, list) => {
      const t = norm(v);
      return list.every(group => group.split('|').some(term => t.includes(norm(term))));
    },
    contientUn:   (v, list) => {
      const t = norm(v);
      return list.some(term => t.includes(norm(term)));
    },
    neContientPas:(v, list) => {
      const t = norm(v);
      return !list.some(term => t.includes(norm(term)));
    },

    // Un montant en euros : 300€, 1 200 €, 49.90 EUR…
    montantEuro:  (v) => /(\d[\d\s.,]{0,9})\s*(€|eur\b|euros?\b)/i.test(v || ''),
    // Un montant supérieur ou égal à n
    montantMin:   (v, n) => {
      const re = /(\d[\d\s.,]{0,9})\s*(?:€|eur\b|euros?\b)/gi;
      let m, max = 0;
      while ((m = re.exec(v || '')) !== null) {
        const val = parseFloat(m[1].replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
        if (!isNaN(val) && val > max) max = val;
      }
      return max >= n;
    },
    // Une durée explicite : 3 h, 2 jours, 45 min, 2 semaines
    duree:        (v) => /\d+\s*(h\b|heures?\b|jours?\b|j\b|min\b|minutes?\b|semaines?\b|mois\b)/i.test(v || ''),
    nombre:       (v) => /\d/.test(v || ''),

    // Nombre de lignes distinctes (anti copier-coller de la même ligne)
    lignesDistinctes: (v, n) => {
      const set = new Set(lines(v).map(norm));
      return set.size >= n;
    },
    // Nombre de puces / lignes commençant par -, *, • ou un chiffre
    puces: (v, n) => lines(v).filter(l => /^([-*•·]|\d+[.)])\s+/.test(l)).length >= n,

    // URL valide, éventuellement restreinte à des hôtes ou extensions
    url: (v, opt) => {
      opt = opt || {};
      const raw = (v || '').trim();
      let u;
      try { u = new URL(raw); } catch { return false; }
      if (!/^https?:$/.test(u.protocol)) return false;
      if (opt.hotes && !opt.hotes.some(h => u.hostname.toLowerCase().includes(h))) return false;
      if (opt.extensions && !opt.extensions.some(e => u.pathname.toLowerCase().endsWith(e))) return false;
      return true;
    },

    // JSON parsable
    jsonValide: (v) => {
      try { JSON.parse(v); return true; } catch { return false; }
    },
    // JSON contenant des clés au premier niveau
    jsonClefs: (v, keys) => {
      try {
        const o = JSON.parse(v);
        return keys.every(k => Object.prototype.hasOwnProperty.call(o, k));
      } catch { return false; }
    },
    // Un workflow n8n avec au moins n nœuds
    n8nNoeuds: (v, n) => {
      try {
        const o = JSON.parse(v);
        return Array.isArray(o.nodes) && o.nodes.length >= n;
      } catch { return false; }
    },
    // Le workflow n8n contient un type de nœud donné (recherche large)
    n8nType: (v, motifs) => {
      try {
        const o = JSON.parse(v);
        if (!Array.isArray(o.nodes)) return false;
        const types = o.nodes.map(x => norm(x.type || ''));
        return motifs.some(m => types.some(t => t.includes(norm(m))));
      } catch { return false; }
    },

    // Regex libre
    motif: (v, pattern) => {
      try { return new RegExp(pattern, 'i').test(v || ''); } catch { return false; }
    },
  };

  // ── Stockage des livrables ─────────────────────────────────────────────
  function getLivrables() {
    try { return JSON.parse(localStorage.getItem(LIVRABLES_KEY) || '{}'); }
    catch { return {}; }
  }
  function setLivrable(moduleNum, champId, valeur) {
    const all = getLivrables();
    const k = 'm' + moduleNum;
    all[k] = all[k] || { champs: {} };
    all[k].champs = all[k].champs || {};
    all[k].champs[champId] = valeur;
    all[k].majAt = Date.now();
    localStorage.setItem(LIVRABLES_KEY, JSON.stringify(all));
  }
  function setScore(moduleNum, score, detail) {
    const all = getLivrables();
    const k = 'm' + moduleNum;
    all[k] = all[k] || { champs: {} };
    all[k].score = score;
    all[k].detail = detail;
    all[k].valideAt = Date.now();
    localStorage.setItem(LIVRABLES_KEY, JSON.stringify(all));
  }

  // ── Styles ─────────────────────────────────────────────────────────────
  let stylesOk = false;
  function injectStyles() {
    if (stylesOk) return; stylesOk = true;
    const css = `
    .defi{background:var(--bg-card);border:2px solid var(--gold-glow2);border-radius:var(--radius-lg);padding:32px;margin:40px 0 0;animation:defiIn .4s cubic-bezier(.2,.7,.2,1) both}
    .defi-eyebrow{display:inline-flex;align-items:center;gap:7px;font-family:'Sora',sans-serif;font-size:11px;font-weight:800;color:var(--gold);text-transform:uppercase;letter-spacing:.1em;background:var(--gold-glow);border:1px solid var(--gold-glow2);padding:5px 12px;border-radius:100px;margin-bottom:14px}
    .defi-title{font-family:'Sora',sans-serif;font-size:1.25rem;font-weight:800;color:var(--text);margin:0 0 10px;line-height:1.3}
    .defi-brief{font-size:15px;color:var(--text-light);line-height:1.8;margin-bottom:8px}
    .defi-brief b{color:var(--text)}
    .defi-bareme{background:var(--bg-card-2);border:1px solid var(--border);border-radius:10px;padding:14px 18px;margin:18px 0 24px}
    .defi-bareme-t{font-family:'Sora',sans-serif;font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .defi-bareme ul{margin:0;padding-left:18px;list-style:none}
    .defi-bareme li{font-size:13px;color:var(--text-muted);line-height:1.7;display:flex;justify-content:space-between;gap:14px;border-bottom:1px dashed var(--border);padding:4px 0}
    .defi-bareme li:last-child{border-bottom:none}
    .defi-bareme li span:last-child{color:var(--gold);font-weight:700;white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:12px}
    .defi-champ{margin-bottom:26px}
    .defi-label{display:block;font-family:'Sora',sans-serif;font-weight:700;color:var(--text);font-size:15px;margin-bottom:6px}
    .defi-aide{font-size:13px;color:var(--text-muted);line-height:1.7;margin-bottom:10px}
    .defi-aide code{font-family:'JetBrains Mono',monospace;font-size:12px;background:var(--bg-card-2);border:1px solid var(--border);padding:1px 5px;border-radius:4px;color:var(--gold-dark)}
    .defi-input,.defi-textarea{width:100%;background:var(--bg-card-2);border:1px solid var(--border);border-radius:10px;padding:13px 15px;color:var(--text);font-family:'Inter',sans-serif;font-size:14px;line-height:1.7;resize:vertical;transition:border-color .2s ease,box-shadow .2s ease}
    .defi-textarea.mono{font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.6}
    .defi-input:focus,.defi-textarea:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-glow)}
    .defi-compteur{font-size:11.5px;color:var(--text-muted);text-align:right;margin-top:5px;font-family:'JetBrains Mono',monospace}
    .defi-criteres{margin-top:12px;display:none}
    .defi-criteres.on{display:block}
    .defi-crit{display:flex;align-items:flex-start;gap:9px;font-size:13px;line-height:1.6;padding:5px 0;color:var(--text-muted)}
    .defi-crit-ic{width:17px;height:17px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;margin-top:2px}
    .defi-crit.ok .defi-crit-ic{background:var(--green);color:#fff}
    .defi-crit.ko .defi-crit-ic{background:var(--red);color:#fff}
    .defi-crit.ok{color:var(--text-light)}
    .defi-crit-pts{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11.5px;opacity:.75;white-space:nowrap;padding-left:10px}
    .defi-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
    .defi-btn{flex:1;min-width:190px;background:var(--gold);color:var(--on-gold);font-family:'Sora',sans-serif;font-size:13.5px;font-weight:800;padding:16px 26px;border:none;border-radius:10px;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,background .2s ease}
    .defi-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:var(--shadow-gold)}
    .defi-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
    .defi-btn-2{flex:0 0 auto;min-width:0;background:transparent;color:var(--text-muted);border:1px solid var(--border);font-weight:700;font-size:12.5px;padding:16px 20px}
    .defi-btn-2:hover{color:var(--text);border-color:var(--gold);box-shadow:none;transform:none}
    .defi-score{display:flex;align-items:center;gap:18px;background:var(--bg-card-2);border:1px solid var(--border);border-radius:12px;padding:18px 22px;margin:22px 0 4px}
    .defi-score.ok{border-color:var(--green);background:color-mix(in srgb,var(--green) 8%,transparent)}
    .defi-score.ko{border-color:var(--red);background:color-mix(in srgb,var(--red) 8%,transparent)}
    .defi-score-n{font-family:'Sora',sans-serif;font-size:2.1rem;font-weight:900;line-height:1;color:var(--gold)}
    .defi-score.ok .defi-score-n{color:var(--green)}
    .defi-score.ko .defi-score-n{color:var(--red)}
    .defi-score-txt{font-size:14px;color:var(--text-light);line-height:1.65}
    .defi-score-txt b{color:var(--text);font-family:'Sora',sans-serif}
    .defi-done{text-align:center;padding:14px 0}
    .defi-done-ic{font-size:44px;margin-bottom:10px}
    .defi-done h3{font-family:'Sora',sans-serif;color:var(--green);font-size:1.15rem;margin-bottom:6px}
    .defi-done p{color:var(--text-muted);font-size:14px;line-height:1.7;margin-bottom:16px}
    .defi-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(12px);background:var(--text);color:var(--bg-dark);font-family:'Sora',sans-serif;font-size:13px;font-weight:700;padding:12px 22px;border-radius:100px;z-index:10001;opacity:0;transition:opacity .25s ease,transform .25s ease;pointer-events:none}
    .defi-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
    @keyframes defiIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @media (max-width:640px){.defi{padding:22px 16px}.defi-btn{min-width:100%}.defi-btn-2{width:100%}}
    @media (prefers-reduced-motion:reduce){.defi{animation:none}.defi-btn,.defi-input,.defi-textarea,.defi-toast{transition:none}}
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function toast(msg) {
    let t = document.querySelector('.defi-toast');
    if (!t) { t = document.createElement('div'); t.className = 'defi-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(t._to);
    t._to = setTimeout(() => t.classList.remove('on'), 2200);
  }

  function copier(texte, msg) {
    const done = () => toast(msg || 'Copié ✓');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texte).then(done).catch(() => fallback());
    } else fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = texte; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch { toast('Copie impossible — sélectionne le texte'); }
      ta.remove();
    }
  }

  // ── Rendu du défi ──────────────────────────────────────────────────────
  function renderDefi(mount, moduleNum, defi) {
    injectStyles();
    const el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if (!el) return;

    const seuil = defi.seuil || 70;
    const totalPts = defi.champs.reduce((s, c) => s + c.criteres.reduce((a, k) => a + k.pts, 0), 0);
    const dejaFait = AB.isModuleDone(moduleNum);
    const sauvegarde = getLivrables()['m' + moduleNum] || { champs: {} };

    el.innerHTML = `
      <div class="defi">
        <div class="defi-eyebrow">🎮 Défi ${moduleNum} — validation par livrable</div>
        <h2 class="defi-title">${defi.titre}</h2>
        <div class="defi-brief">${defi.brief}</div>
        <div class="defi-bareme">
          <div class="defi-bareme-t">Barème — ${seuil} points sur 100 pour valider</div>
          <ul>${defi.champs.map(c =>
            `<li><span>${c.label}</span><span>${c.criteres.reduce((a, k) => a + k.pts, 0)} pts</span></li>`
          ).join('')}</ul>
        </div>
        <form class="defi-form" novalidate></form>
        <div class="defi-score-mount"></div>
        <div class="defi-actions">
          <button type="button" class="defi-btn" data-act="verif">Vérifier mon rendu</button>
          <button type="button" class="defi-btn defi-btn-2" data-act="copier">📋 Copier mon rendu</button>
        </div>
      </div>`;

    const form = el.querySelector('.defi-form');
    const scoreMount = el.querySelector('.defi-score-mount');

    defi.champs.forEach(c => {
      const wrap = document.createElement('div');
      wrap.className = 'defi-champ';
      const isArea = c.type !== 'text' && c.type !== 'url';
      const val = sauvegarde.champs[c.id] || '';
      wrap.innerHTML = `
        <label class="defi-label" for="d${moduleNum}-${c.id}">${c.label}</label>
        ${c.aide ? `<div class="defi-aide">${c.aide}</div>` : ''}
        ${isArea
          ? `<textarea id="d${moduleNum}-${c.id}" class="defi-textarea${c.type === 'json' ? ' mono' : ''}" rows="${c.rows || 5}" placeholder="${(c.placeholder || '').replace(/"/g, '&quot;')}" spellcheck="true"></textarea>`
          : `<input id="d${moduleNum}-${c.id}" class="defi-input" type="text" placeholder="${(c.placeholder || '').replace(/"/g, '&quot;')}" />`}
        <div class="defi-compteur"></div>
        <div class="defi-criteres">${c.criteres.map((k, i) =>
          `<div class="defi-crit" data-k="${i}"><span class="defi-crit-ic">·</span><span>${k.label}</span><span class="defi-crit-pts">${k.pts} pts</span></div>`
        ).join('')}</div>`;
      form.appendChild(wrap);

      const input = wrap.querySelector('.defi-textarea, .defi-input');
      const compteur = wrap.querySelector('.defi-compteur');
      input.value = val;

      const maj = () => {
        const n = words(input.value).length;
        const l = lines(input.value).length;
        compteur.textContent = `${n} mot${n > 1 ? 's' : ''} · ${l} ligne${l > 1 ? 's' : ''}`;
      };
      maj();
      let deb;
      input.addEventListener('input', () => {
        maj();
        clearTimeout(deb);
        deb = setTimeout(() => setLivrable(moduleNum, c.id, input.value), 400);
      });
      c._input = input;
      c._crits = wrap.querySelector('.defi-criteres');
    });

    function evalue() {
      let obtenus = 0;
      const detail = [];
      defi.champs.forEach(c => {
        const v = c._input.value;
        setLivrable(moduleNum, c.id, v);
        c._crits.classList.add('on');
        c.criteres.forEach((k, i) => {
          const fn = TESTS[k.test];
          let ok = false;
          try { ok = fn ? !!fn(v, k.arg) : false; } catch { ok = false; }
          if (ok) obtenus += k.pts;
          detail.push({ champ: c.label, critere: k.label, pts: k.pts, ok });
          const row = c._crits.querySelector(`.defi-crit[data-k="${i}"]`);
          row.classList.toggle('ok', ok);
          row.classList.toggle('ko', !ok);
          row.querySelector('.defi-crit-ic').textContent = ok ? '✓' : '✗';
          row.querySelector('.defi-crit-pts').textContent = ok ? `+${k.pts}` : `0/${k.pts}`;
        });
      });
      const score = totalPts ? Math.round((obtenus / totalPts) * 100) : 0;
      return { score, obtenus, detail };
    }

    function afficheScore(r) {
      const reussi = r.score >= seuil;
      const manque = r.detail.filter(d => !d.ok);
      scoreMount.innerHTML = `
        <div class="defi-score ${reussi ? 'ok' : 'ko'}">
          <div class="defi-score-n">${r.score}</div>
          <div class="defi-score-txt">
            <b>${reussi ? 'Défi validé' : 'Pas encore'}</b> — ${r.obtenus} / ${totalPts} points (seuil ${seuil}/100).<br/>
            ${reussi
              ? 'Ton livrable est enregistré. Tu peux le copier pour le faire relire par Tony.'
              : `Il te manque : ${manque.slice(0, 3).map(m => m.critere.replace(/<[^>]*>/g, '')).join(' · ')}${manque.length > 3 ? ` (+${manque.length - 3})` : ''}. Corrige et revérifie — pas de limite d'essais.`}
          </div>
        </div>`;
      scoreMount.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function texteRendu(r) {
      const l = [];
      l.push(`=== MODULE ${moduleNum} — ${defi.titre} ===`);
      if (r) l.push(`Score auto : ${r.score}/100 (seuil ${seuil})`);
      l.push(`Date : ${new Date().toLocaleString('fr-FR')}`);
      l.push('');
      defi.champs.forEach(c => {
        l.push(`--- ${c.label} ---`);
        l.push((c._input.value || '(vide)').trim());
        l.push('');
      });
      return l.join('\n');
    }

    el.querySelector('[data-act="verif"]').onclick = () => {
      const r = evalue();
      afficheScore(r);
      setScore(moduleNum, r.score, r.detail.map(d => ({ c: d.critere, ok: d.ok })));
      if (r.score >= seuil && !AB.isModuleDone(moduleNum)) {
        setTimeout(() => AB.completeModule(moduleNum, r.score), 900);
      }
    };
    el.querySelector('[data-act="copier"]').onclick = () => copier(texteRendu(null), 'Rendu du module ' + moduleNum + ' copié ✓');

    if (dejaFait) {
      const r = getLivrables()['m' + moduleNum] || {};
      const bloc = document.createElement('div');
      bloc.className = 'defi-score ok';
      bloc.innerHTML = `<div class="defi-score-n">${r.score != null ? r.score : '✓'}</div>
        <div class="defi-score-txt"><b>Défi déjà validé</b> — module suivant débloqué. Tu peux améliorer ton livrable et revérifier : le meilleur score est conservé.</div>`;
      scoreMount.appendChild(bloc);
    }
  }

  // ── Récapitulatif global (page mon-rendu.html) ─────────────────────────
  function texteRecapGlobal(modules) {
    const all = getLivrables();
    const l = [];
    l.push('=========================================');
    l.push('RENDU FORMATION — AutomationBoost');
    l.push('Généré le ' + new Date().toLocaleString('fr-FR'));
    l.push('=========================================');
    l.push('');
    let totalScore = 0, nb = 0;
    modules.forEach(m => {
      const d = all['m' + m.n];
      l.push('');
      l.push(`### MODULE ${m.n} — ${m.titre}`);
      if (!d || !d.champs || !Object.keys(d.champs).length) { l.push('(aucun livrable rendu)'); return; }
      if (d.score != null) { l.push(`Score auto : ${d.score}/100`); totalScore += d.score; nb++; }
      if (d.valideAt) l.push(`Validé le : ${new Date(d.valideAt).toLocaleString('fr-FR')}`);
      l.push('');
      (m.champs || Object.keys(d.champs)).forEach(c => {
        const id = typeof c === 'string' ? c : c.id;
        const lab = typeof c === 'string' ? c : c.label;
        const v = (d.champs[id] || '').trim();
        l.push(`— ${lab} —`);
        l.push(v || '(vide)');
        l.push('');
      });
    });
    l.push('');
    l.push('=========================================');
    l.push(`Modules rendus : ${nb}/${modules.length}` + (nb ? ` · Moyenne auto : ${Math.round(totalScore / nb)}/100` : ''));
    l.push('=========================================');
    return l.join('\n');
  }

  AB.TESTS = TESTS;
  AB.renderDefi = renderDefi;
  AB.getLivrables = getLivrables;
  AB.texteRecapGlobal = texteRecapGlobal;
  AB.copier = copier;
  AB.toast = toast;
  AB.injectDefiStyles = injectStyles;
})();
