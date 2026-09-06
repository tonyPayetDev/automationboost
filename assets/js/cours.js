/* AutomationBoost — Cours Gamifié
   Token validation + progress tracking via localStorage
   N8N_VALIDATE_URL doit pointer vers ton webhook n8n
*/

const AB = {
  N8N_VALIDATE_URL: 'https://n7n.automatisationboost.com/webhook/validate-token',
  ACCESS_KEY: 'ab_cours_access',
  PROGRESS_KEY: 'ab_cours_progress',
  TOTAL_MODULES: 6,

  // Le niveau dépend du nombre de DÉFIS validés (livrables produits),
  // pas du temps passé à lire. L'XP affichée = somme des scores obtenus.
  LEVELS: [
    { mods: 0, title: 'Spectateur',       badge: '🌱' },
    { mods: 1, title: 'Premier livrable', badge: '⚔️' },
    { mods: 2, title: 'Offre prête',      badge: '💼' },
    { mods: 3, title: 'En prospection',   badge: '🤝' },
    { mods: 4, title: 'Automatiseur',     badge: '🤖' },
    { mods: 5, title: 'Producteur',       badge: '🎬' },
    { mods: 6, title: 'Système monté',    badge: '👑' },
  ],

  BADGES: [
    { module: 1, name: 'Livrable en main',   icon: '⚔️' },
    { module: 2, name: 'Offre chiffrée',     icon: '💼' },
    { module: 3, name: 'Pipeline ouvert',    icon: '🤝' },
    { module: 4, name: 'Automatiseur',       icon: '🤖' },
    { module: 5, name: 'Machine à contenu',  icon: '🎬' },
    { module: 6, name: 'Système monté',      icon: '👑' },
  ],

  getAccess() {
    try { return JSON.parse(localStorage.getItem(this.ACCESS_KEY) || 'null'); }
    catch { return null; }
  },

  hasAccess() {
    const a = this.getAccess();
    return !!(a && a.granted);
  },

  grantAccess(token, email) {
    localStorage.setItem(this.ACCESS_KEY, JSON.stringify({ granted: true, token, email, grantedAt: Date.now() }));
  },

  // Free preview: module 1 is readable without a purchase until this date
  // (Tony's decision on 2026-09-06, two weeks). After that, requireAccess is
  // strict again — nothing else to revert.
  FREE_PREVIEW: { module: 1, until: '2026-09-20T23:59:59+04:00' },

  isFreePreview(n) {
    const f = this.FREE_PREVIEW;
    return !!f && Number(n) === f.module && Date.now() < Date.parse(f.until);
  },

  // allowPreview: the page is part of the free preview (module 1 + dashboard)
  requireAccess(redirectBase = '', allowPreview = false) {
    if (allowPreview && this.isFreePreview(this.FREE_PREVIEW.module)) return;
    if (!this.hasAccess()) {
      window.location.href = redirectBase + '/acces.html';
    }
  },

  getProgress() {
    try { return JSON.parse(localStorage.getItem(this.PROGRESS_KEY) || '{}'); }
    catch { return {}; }
  },

  isModuleUnlocked(n) {
    if (n <= 1) return true;
    return !!this.getProgress()[`m${n - 1}`]?.done;
  },

  isModuleDone(n) {
    return !!this.getProgress()[`m${n}`]?.done;
  },

  // completeModule(n, score) — le score du défi (0-100) EST l'XP gagnée.
  // Rejouer un défi met à jour l'XP si le score est meilleur, sans rejouer
  // la modale de déblocage.
  completeModule(n, score) {
    const xp = Math.max(0, Math.min(100, Math.round(score == null ? 100 : score)));
    const p = this.getProgress();
    const deja = !!p[`m${n}`]?.done;
    if (deja) {
      if (xp > (p[`m${n}`].xp || 0)) {
        p[`m${n}`].xp = xp;
        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(p));
      }
      return;
    }
    p[`m${n}`] = { done: true, doneAt: Date.now(), xp };
    localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(p));
    this._showCompletionModal(n, xp);
  },

  getModuleScore(n) {
    return this.getProgress()[`m${n}`]?.xp ?? null;
  },

  getTotalXP() {
    return Object.values(this.getProgress()).reduce((s, m) => s + (m.xp || 0), 0);
  },

  getCompletedCount() {
    return Object.values(this.getProgress()).filter(m => m.done).length;
  },

  getCurrentLevel() {
    const xp = this.getTotalXP();
    const done = this.getCompletedCount();
    let lvl = this.LEVELS[0];
    for (const l of this.LEVELS) { if (done >= l.mods) lvl = l; }
    const idx = this.LEVELS.indexOf(lvl);
    const next = this.LEVELS[idx + 1] || null;
    return { ...lvl, xp, done, next };
  },

  async validateToken(token) {
    try {
      const r = await fetch(this.N8N_VALIDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  },

  _showCompletionModal(moduleNum, scoreGagne) {
    const badge = this.BADGES.find(b => b.module === moduleNum);
    const lvl = this.getCurrentLevel();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--gold-glow2);border-radius:18px;padding:44px 36px;max-width:440px;width:100%;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,0.35)">
        <div style="font-size:60px;margin-bottom:14px">${badge?.icon || '⚡'}</div>
        <div style="font-size:11px;font-weight:800;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px">Défi validé — badge débloqué</div>
        <h2 style="font-family:'Sora',sans-serif;font-size:1.35rem;color:var(--text);margin-bottom:8px">${badge?.name || 'Module complété'}</h2>
        <p style="color:var(--text-muted);font-size:14px;margin-bottom:22px;line-height:1.65">+${scoreGagne} XP (ton score au défi)${moduleNum < 6 ? ' — le module suivant est déverrouillé.' : ' — tu as fini le parcours.'}</p>
        <div style="background:var(--bg-card-2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:22px">
          <div style="font-size:26px;margin-bottom:4px">${lvl.badge}</div>
          <div style="font-size:13px;font-weight:800;color:var(--gold);font-family:'Sora',sans-serif">${lvl.title}</div>
          <div style="font-size:12px;color:var(--text-muted)">${lvl.xp} XP cumulés</div>
        </div>
        <button type="button" style="background:var(--gold);color:var(--on-gold);font-family:'Sora',sans-serif;font-size:13px;font-weight:800;padding:15px 32px;border:none;border-radius:10px;cursor:pointer;width:100%">
          ${moduleNum < 6 ? '→ Module suivant' : '🏆 Voir mon rendu complet'}
        </button>
        <button type="button" data-rester style="background:none;border:none;color:var(--text-muted);font-size:12.5px;margin-top:12px;cursor:pointer;text-decoration:underline">Rester sur cette page</button>
      </div>`;
    const nextUrl = moduleNum < 6 ? `module-${moduleNum + 1}.html` : 'mon-rendu.html';
    overlay.querySelector('button').onclick = () => { overlay.remove(); window.location.href = nextUrl; };
    overlay.querySelector('[data-rester]').onclick = () => overlay.remove();
    document.body.appendChild(overlay);
    this._confetti();
  },

  _confetti() {
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      const colors = ['#eab308', '#f97316', '#22c55e', '#818cf8', '#e879f9'];
      el.style.cssText = `position:fixed;width:8px;height:8px;background:${colors[i%colors.length]};left:${Math.random()*100}%;top:-10px;z-index:10000;border-radius:2px;animation:fall${i} ${1+Math.random()*2}s linear forwards`;
      const style = document.createElement('style');
      style.textContent = `@keyframes fall${i}{to{transform:translateY(110vh) rotate(${Math.random()*360}deg);opacity:0}}`;
      document.head.appendChild(style);
      document.body.appendChild(el);
      setTimeout(() => { el.remove(); style.remove(); }, 3000);
    }
  },

  renderProgressBar(containerEl) {
    const done = this.getCompletedCount();
    const pct = Math.round((done / this.TOTAL_MODULES) * 100);
    const lvl = this.getCurrentLevel();
    containerEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-size:13px;color:var(--text-muted)">${done}/${this.TOTAL_MODULES} défis validés</span>
        <span style="font-size:13px;font-weight:800;color:var(--gold);font-family:'Sora',sans-serif">${lvl.badge} ${lvl.title} — ${lvl.xp} XP</span>
      </div>
      <div style="background:var(--bg-card-2);border:1px solid var(--border);border-radius:100px;height:9px;overflow:hidden">
        <div style="background:linear-gradient(90deg,var(--gold),var(--orange));height:100%;width:${pct}%;border-radius:100px;transition:width .6s ease"></div>
      </div>`;
  },

  // ---- Styles partagés (liens ressources) ----------------------------------
  // Le QCM de mémorisation a été retiré : la validation d'un module se fait
  // désormais par un DÉFI à livrable auto-scoré (voir assets/js/defi.js).
  _sharedStylesInjected: false,
  _injectQuizStyles() {
    if (this._sharedStylesInjected) return;
    this._sharedStylesInjected = true;
    const css = `
    .res-links{background:var(--bg-card-2);border:1px solid var(--border);border-left:3px solid var(--green);border-radius:10px;padding:16px 20px;margin:22px 0}
    .res-links-label{font-family:'Sora',sans-serif;font-size:11px;font-weight:800;color:var(--green);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .res-links a{display:flex;align-items:center;gap:8px;color:var(--text-light);text-decoration:none;font-size:14px;padding:7px 0;border-bottom:1px solid var(--border);transition:color .2s ease}
    .res-links a:last-child{border-bottom:none}
    .res-links a::before{content:'→';color:var(--green);transition:transform .2s ease;display:inline-block}
    .res-links a:hover{color:var(--gold-dark)}
    .res-links a:hover::before{transform:translateX(3px)}
    @media (prefers-reduced-motion: reduce){.res-links a,.res-links a::before{transition:none}}
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  },
};

window.AB = AB;
if (typeof document !== 'undefined') AB._injectQuizStyles();
