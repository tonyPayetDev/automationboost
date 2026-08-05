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
  },

  // ---- Quiz de validation ---------------------------------------------------
  // renderQuiz(mount, moduleNum, questions)
  //   questions = [{ q, options:[...], correct:<index>, explain }]
  // Le module n'est validé (completeModule) QUE si toutes les réponses sont
  // correctes. Sinon : options fautives marquées, explications révélées, retry.
  _quizStylesInjected: false,
  _injectQuizStyles() {
    if (this._quizStylesInjected) return;
    this._quizStylesInjected = true;
    const css = `
    .res-links{background:#0b0b0b;border:1px solid #1a1a1a;border-left:3px solid #22c55e;border-radius:8px;padding:16px 20px;margin:20px 0}
    .res-links-label{font-size:11px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;font-family:'Rajdhani',sans-serif}
    .res-links a{display:flex;align-items:center;gap:8px;color:#a1a1aa;text-decoration:none;font-size:14px;padding:7px 0;border-bottom:1px solid #141414;transition:color .2s ease,transform .2s ease}
    .res-links a:last-child{border-bottom:none}
    .res-links a::before{content:'→';color:#4ade80;transition:transform .2s ease}
    .res-links a:hover{color:#e4e4e7}
    .res-links a:hover::before{transform:translateX(3px)}
    .quiz{background:#0d0d0d;border:2px solid rgba(234,179,8,.25);border-radius:14px;padding:32px;margin:32px 0 0;animation:quizIn .4s cubic-bezier(.2,.7,.2,1) both}
    .quiz-eyebrow{font-size:11px;font-weight:700;color:#eab308;text-transform:uppercase;letter-spacing:.08em;font-family:'Orbitron',sans-serif;margin-bottom:6px}
    .quiz-title{font-family:'Orbitron',sans-serif;font-size:1.05rem;font-weight:700;color:#e4e4e7;margin-bottom:6px;line-height:1.4}
    .quiz-sub{font-size:14px;color:#71717a;margin-bottom:24px;line-height:1.6}
    .quiz-q{margin-bottom:22px}
    .quiz-q-text{font-weight:700;color:#e4e4e7;font-size:15px;margin-bottom:12px;line-height:1.5}
    .quiz-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:14px 16px;margin-bottom:10px;color:#a1a1aa;font-size:14px;line-height:1.4;cursor:pointer;font-family:inherit;transition:transform .15s cubic-bezier(.2,.7,.2,1),border-color .2s ease,background .2s ease,color .2s ease}
    .quiz-opt:hover:not(.locked){border-color:rgba(234,179,8,.4);color:#e4e4e7}
    .quiz-opt:active:not(.locked){transform:scale(.985)}
    .quiz-mark{width:20px;height:20px;border-radius:50%;border:2px solid #333;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;transition:border-color .2s ease,background .2s ease}
    .quiz-opt.selected{border-color:#eab308;background:rgba(234,179,8,.06);color:#e4e4e7}
    .quiz-opt.selected .quiz-mark{border-color:#eab308;background:#eab308;color:#000}
    .quiz-opt.correct{border-color:#22c55e;background:rgba(34,197,94,.08);color:#e4e4e7}
    .quiz-opt.correct .quiz-mark{border-color:#22c55e;background:#22c55e;color:#000}
    .quiz-opt.wrong{border-color:#ef4444;background:rgba(239,68,68,.08);color:#e4e4e7;animation:quizShake .4s ease}
    .quiz-opt.wrong .quiz-mark{border-color:#ef4444;background:#ef4444;color:#fff}
    .quiz-opt.locked{cursor:default}
    .quiz-explain{font-size:13px;color:#71717a;line-height:1.6;margin:2px 0 4px;padding-left:4px}
    .quiz-explain b{color:#4ade80}
    .quiz-feedback{font-size:14px;font-weight:700;margin:6px 0 18px;min-height:18px}
    .quiz-feedback.ok{color:#4ade80}
    .quiz-feedback.ko{color:#f87171}
    .quiz-btn{background:#eab308;color:#000;font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;padding:16px 32px;border:none;border-radius:8px;cursor:pointer;width:100%;transition:transform .2s ease,box-shadow .2s ease,background .2s ease}
    .quiz-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(234,179,8,.25)}
    .quiz-btn:disabled{background:#3f3f46;color:#71717a;cursor:not-allowed}
    .quiz-done{text-align:center;padding:8px 0}
    .quiz-done-icon{font-size:40px;margin-bottom:8px}
    .quiz-done h3{font-family:'Orbitron',sans-serif;color:#4ade80;font-size:1.1rem;margin-bottom:4px}
    .quiz-done p{color:#71717a;font-size:14px}
    @keyframes quizIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    @keyframes quizShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
    @media (prefers-reduced-motion: reduce){
      .quiz{animation:none}
      .quiz-opt,.quiz-btn,.quiz-mark,.res-links a,.res-links a::before{transition:none}
      .quiz-opt.wrong{animation:none}
      .quiz-opt:active:not(.locked){transform:none}
    }`;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  },

  renderQuiz(mount, moduleNum, questions) {
    this._injectQuizStyles();
    const el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if (!el) return;

    el.innerHTML = `
      <div class="quiz">
        <div class="quiz-eyebrow">🎯 Quiz de validation</div>
        <div class="quiz-title">Valide le module ${moduleNum} pour débloquer la suite</div>
        <div class="quiz-sub">Réponds correctement aux ${questions.length} questions ci-dessous. Tu peux réessayer autant de fois que nécessaire.</div>
        <div class="quiz-form"></div>
        <div class="quiz-feedback"></div>
        <button type="button" class="quiz-btn" disabled>Valider mes réponses</button>
      </div>`;

    if (this.isModuleDone(moduleNum)) {
      el.querySelector('.quiz').innerHTML =
        '<div class="quiz-done"><div class="quiz-done-icon">✅</div><h3>Module validé</h3><p>Tu as déjà réussi ce quiz — le module suivant est débloqué.</p></div>';
      return;
    }

    const form = el.querySelector('.quiz-form');
    const fb = el.querySelector('.quiz-feedback');
    const submit = el.querySelector('.quiz-btn');
    const state = questions.map(() => null);

    questions.forEach((q, qi) => {
      const qd = document.createElement('div');
      qd.className = 'quiz-q';
      const qt = document.createElement('div');
      qt.className = 'quiz-q-text';
      qt.textContent = `${qi + 1}. ${q.q}`;
      qd.appendChild(qt);

      q.options.forEach((opt, oi) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiz-opt';
        b.dataset.q = qi;
        const mark = document.createElement('span');
        mark.className = 'quiz-mark';
        const label = document.createElement('span');
        label.textContent = opt;
        b.appendChild(mark);
        b.appendChild(label);
        b.onclick = () => {
          if (b.classList.contains('locked')) return;
          qd.querySelectorAll('.quiz-opt').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
          state[qi] = oi;
          submit.disabled = state.some(s => s === null);
        };
        qd.appendChild(b);
      });

      const ex = document.createElement('div');
      ex.className = 'quiz-explain';
      ex.style.display = 'none';
      if (q.explain) ex.innerHTML = `<b>Réponse :</b> ${q.explain}`;
      qd.appendChild(ex);
      form.appendChild(qd);
    });

    const grade = () => {
      let correct = 0;
      questions.forEach((q, qi) => {
        const opts = form.querySelectorAll(`.quiz-opt[data-q="${qi}"]`);
        opts.forEach(o => { o.classList.remove('correct', 'wrong'); o.classList.add('locked'); });
        const sel = state[qi];
        if (sel === q.correct) { correct++; opts[sel].classList.add('correct'); }
        else { if (sel != null) opts[sel].classList.add('wrong'); opts[q.correct].classList.add('correct'); }
      });

      if (correct === questions.length) {
        fb.className = 'quiz-feedback ok';
        fb.textContent = `✓ ${correct}/${questions.length} — Parfait, module validé !`;
        submit.disabled = true;
        submit.textContent = 'Validé ✓';
        setTimeout(() => this.completeModule(moduleNum), 800);
      } else {
        fb.className = 'quiz-feedback ko';
        fb.textContent = `${correct}/${questions.length} bonnes réponses. Revois les points ci-dessous et réessaie.`;
        form.querySelectorAll('.quiz-explain').forEach(e => { e.style.display = 'block'; });
        submit.textContent = 'Réessayer';
        submit.onclick = () => this.renderQuiz(mount, moduleNum, questions);
      }
    };

    submit.onclick = grade;
  }
};

window.AB = AB;
