/* AutomationBoost — Cours Gamifié
   Token validation + progress tracking via localStorage
   N8N_VALIDATE_URL doit pointer vers ton webhook n8n
*/

const AB = {
  N8N_VALIDATE_URL: 'https://n7n.automatisationboost.com/webhook/validate-token',
  ACCESS_KEY: 'ab_cours_access',
  PROGRESS_KEY: 'ab_cours_progress',
  TOTAL_MODULES: 6,

  LEVELS: [
    { xp: 0,   title: 'Débutant',         badge: '🌱' },
    { xp: 100, title: 'IA Starter',        badge: '⚡' },
    { xp: 200, title: 'IA Apprenti',       badge: '🔧' },
    { xp: 300, title: 'IA Practitioner',   badge: '🚀' },
    { xp: 400, title: 'IA Builder',        badge: '🏗️' },
    { xp: 500, title: 'IA Architect',      badge: '🎯' },
    { xp: 600, title: 'IA Master',         badge: '👑' },
  ],

  BADGES: [
    { module: 1, name: 'Arsenal Déployé',   icon: '⚔️' },
    { module: 2, name: 'Premier Service',   icon: '💼' },
    { module: 3, name: 'Client Débloqué',   icon: '🤝' },
    { module: 4, name: 'Automatiseur',      icon: '🤖' },
    { module: 5, name: 'Créateur Passif',   icon: '💰' },
    { module: 6, name: 'IA Master',         icon: '👑' },
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

  requireAccess(redirectBase = '') {
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

  completeModule(n, onDone) {
    const p = this.getProgress();
    if (p[`m${n}`]?.done) return;
    p[`m${n}`] = { done: true, doneAt: Date.now(), xp: 100 };
    localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(p));
    this._showCompletionModal(n, onDone);
  },

  getTotalXP() {
    return Object.values(this.getProgress()).reduce((s, m) => s + (m.xp || 0), 0);
  },

  getCompletedCount() {
    return Object.values(this.getProgress()).filter(m => m.done).length;
  },

  getCurrentLevel() {
    const xp = this.getTotalXP();
    let lvl = this.LEVELS[0];
    for (const l of this.LEVELS) { if (xp >= l.xp) lvl = l; }
    const idx = this.LEVELS.indexOf(lvl);
    const next = this.LEVELS[idx + 1] || null;
    return { ...lvl, xp, next };
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

  _showCompletionModal(moduleNum, onDone) {
    const badge = this.BADGES.find(b => b.module === moduleNum);
    const lvl = this.getCurrentLevel();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.innerHTML = `
      <div style="background:#0d0d0d;border:1px solid rgba(234,179,8,0.4);border-radius:16px;padding:48px 40px;max-width:440px;text-align:center;box-shadow:0 0 60px rgba(234,179,8,0.2)">
        <div style="font-size:64px;margin-bottom:16px">${badge?.icon || '⚡'}</div>
        <div style="font-size:11px;font-weight:700;color:#eab308;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">Badge débloqué</div>
        <h2 style="font-family:'Orbitron',sans-serif;font-size:1.4rem;color:#e4e4e7;margin-bottom:8px">${badge?.name || 'Module complété'}</h2>
        <p style="color:#a1a1aa;font-size:14px;margin-bottom:24px">+100 XP — Tu passes ${lvl.xp >= 600 ? 'au niveau max' : 'au niveau suivant'}</p>
        <div style="background:#111;border:1px solid #1a1a1a;border-radius:8px;padding:16px;margin-bottom:24px">
          <div style="font-size:28px;margin-bottom:4px">${lvl.badge}</div>
          <div style="font-size:13px;font-weight:700;color:#eab308">${lvl.title}</div>
          <div style="font-size:12px;color:#71717a">${lvl.xp} XP total</div>
        </div>
        <button onclick="this.closest('[style]').remove();${onDone ? 'window.location.href=onDoneUrl' : ''}" style="background:#eab308;color:#000;font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;padding:14px 32px;border:none;border-radius:8px;cursor:pointer;width:100%">
          ${moduleNum < 6 ? '→ Module suivant' : '🏆 Voir mon tableau de bord'}
        </button>
      </div>`;
    const btn = overlay.querySelector('button');
    const nextUrl = moduleNum < 6 ? `module-${moduleNum + 1}.html` : 'index.html';
    btn.onclick = () => { overlay.remove(); window.location.href = nextUrl; };
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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:13px;color:#a1a1aa">${done}/${this.TOTAL_MODULES} modules complétés</span>
        <span style="font-size:13px;font-weight:700;color:#eab308">${lvl.badge} ${lvl.title} — ${lvl.xp} XP</span>
      </div>
      <div style="background:#1a1a1a;border-radius:100px;height:8px;overflow:hidden">
        <div style="background:linear-gradient(90deg,#eab308,#f97316);height:100%;width:${pct}%;border-radius:100px;transition:width .6s ease"></div>
      </div>`;
  }
};

window.AB = AB;
