/* ============================================================
   AutomationBoost — GSAP Motion Design layer
   Adds scroll-driven & entrance motion on top of the existing
   IntersectionObserver / canvas / counter scripts.
   Fully responsive & respects prefers-reduced-motion via
   gsap.matchMedia() (all setup is reverted automatically when a
   query stops matching).
   ============================================================ */
(function () {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out', duration: 0.7 });

  const mm = gsap.matchMedia();

  mm.add(
    {
      reduce: '(prefers-reduced-motion: reduce)',
      isDesktop: '(min-width: 768px)'
    },
    (ctx) => {
      const { reduce, isDesktop } = ctx.conditions;

      // Users who prefer reduced motion keep the static (already-visible) layout.
      if (reduce) return;

      const cleanups = [];

      /* ---- 1. HERO ENTRANCE TIMELINE ---- */
      const heroTl = gsap.timeline({ defaults: { duration: 0.7, ease: 'power3.out' } });
      heroTl
        .from('.hero-badge', { y: 20, autoAlpha: 0, duration: 0.5 })
        .from('.hero-title .line-1', { y: 34, autoAlpha: 0 }, '-=0.2')
        .from('.hero-title .line-2', { y: 34, autoAlpha: 0 }, '-=0.45')
        .from('.hero-title .line-3', { y: 34, autoAlpha: 0 }, '-=0.45')
        .from('.hero-title .line-4', { y: 34, autoAlpha: 0 }, '-=0.45')
        .from('.hero-subtitle', { y: 22, autoAlpha: 0 }, '-=0.35')
        .from('.hero-cta-group > *', { y: 22, autoAlpha: 0, stagger: 0.12 }, '-=0.25')
        .from('.hero-stats .stat-item', { y: 22, autoAlpha: 0, stagger: 0.1 }, '-=0.2');

      /* ---- 2. SCROLL PROGRESS BAR ---- */
      const progress = document.createElement('div');
      progress.className = 'gsap-scroll-progress';
      progress.style.cssText =
        'position:fixed;top:0;left:0;height:3px;width:100%;transform:scaleX(0);' +
        'transform-origin:0 50%;z-index:9999;pointer-events:none;' +
        'background:linear-gradient(90deg,#eab308,#f59e0b);box-shadow:0 0 12px rgba(234,179,8,.5)';
      document.body.appendChild(progress);
      gsap.to(progress, {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
      });
      cleanups.push(() => progress.remove());

      /* ---- 3. SECTION HEADERS REVEAL ---- */
      const headers = gsap.utils.toArray('.section-label, .section-title');
      if (headers.length) {
        gsap.set(headers, { y: 24, autoAlpha: 0 });
        ScrollTrigger.batch(headers, {
          start: 'top 85%',
          onEnter: (batch) => {
            gsap.to(batch, {
              y: 0,
              autoAlpha: 1,
              stagger: 0.08,
              duration: 0.7,
              ease: 'power3.out',
              overwrite: true
            });
            // Cinematic one-time "shine sweep" on the gold highlight of each
            // revealed title (inspired by motionsites.ai-style hero reveals).
            batch.forEach((el) => {
              const gold = el.querySelector ? el.querySelector('.gold') : null;
              if (gold) gold.classList.add('gold-shine');
            });
          }
        });
      }

      /* ---- 4. STAGGERED CARD / STEP REVEALS ---- */
      const cards = gsap.utils.toArray(
        '.problem-card, .feature-card, .step-item, .pricing-card, .testi-card'
      );
      if (cards.length) {
        gsap.set(cards, { y: 40, autoAlpha: 0, scale: 0.97 });
        ScrollTrigger.batch(cards, {
          start: 'top 88%',
          onEnter: (batch) =>
            gsap.to(batch, {
              y: 0,
              scale: 1,
              autoAlpha: 1,
              stagger: 0.09,
              duration: 0.6,
              ease: 'power3.out',
              overwrite: true,
              // Remove inline transform so CSS :hover transforms work again.
              clearProps: 'transform'
            })
        });
      }

      /* ---- 5. DESKTOP-ONLY FLOURISHES ---- */
      if (isDesktop) {
        // Parallax on the hero glow
        gsap.to('.hero-glow', {
          yPercent: 30,
          ease: 'none',
          scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true
          }
        });

        // Gentle floating dashboard mockup
        const mockup = document.querySelector('.dashboard-mockup');
        if (mockup) {
          gsap.to(mockup, {
            y: -12,
            duration: 3,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
          });
        }

        // Magnetic buttons
        const magnets = gsap.utils.toArray('.btn-primary, .btn-secondary, .nav-cta');
        magnets.forEach((btn) => {
          const move = (e) => {
            const r = btn.getBoundingClientRect();
            const mx = e.clientX - r.left - r.width / 2;
            const my = e.clientY - r.top - r.height / 2;
            gsap.to(btn, { x: mx * 0.25, y: my * 0.4, duration: 0.4, ease: 'power3.out' });
          };
          // Damped return, no overshoot: the exit must not be louder than the
          // entrance, and an elastic wobble on a CTA reads as "not settled yet".
          const leave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.35, ease: 'power2.out' });
          btn.addEventListener('mousemove', move);
          btn.addEventListener('mouseleave', leave);
          cleanups.push(() => {
            btn.removeEventListener('mousemove', move);
            btn.removeEventListener('mouseleave', leave);
            gsap.set(btn, { clearProps: 'transform' });
          });
        });

        // Cursor-following spotlight glow on cards (21st.dev "Card Spotlight"
        // pattern) — sets --mx/--my custom properties consumed by the
        // card's ::after radial-gradient in style.css.
        const spotlightCards = gsap.utils.toArray('.feature-card, .pricing-card, .testi-card');
        spotlightCards.forEach((card) => {
          // Measure once on enter instead of on every move: getBoundingClientRect
          // forces a synchronous reflow, and mousemove can fire at 120Hz.
          let rect = null;
          let frame = 0;
          let px = 0;
          let py = 0;

          const enter = () => { rect = card.getBoundingClientRect(); };
          const move = (e) => {
            if (!rect) rect = card.getBoundingClientRect();
            px = e.clientX - rect.left;
            py = e.clientY - rect.top;
            // Coalesce to one write per frame — setting a custom property
            // invalidates style for the element and its subtree.
            if (frame) return;
            frame = requestAnimationFrame(() => {
              frame = 0;
              card.style.setProperty('--mx', `${px}px`);
              card.style.setProperty('--my', `${py}px`);
            });
          };
          const leave = () => { rect = null; };

          card.addEventListener('mouseenter', enter);
          card.addEventListener('mousemove', move);
          card.addEventListener('mouseleave', leave);
          cleanups.push(() => {
            if (frame) cancelAnimationFrame(frame);
            card.removeEventListener('mouseenter', enter);
            card.removeEventListener('mousemove', move);
            card.removeEventListener('mouseleave', leave);
          });
        });
      }

      // matchMedia auto-reverts GSAP tweens/ScrollTriggers; run manual cleanups too.
      return () => cleanups.forEach((fn) => fn());
    }
  );
})();
