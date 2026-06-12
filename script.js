/* ============================================
   PROPAGAÇÃO DIGITAL — Scripts
   Bilingual, animations, mobile menu
   ============================================ */

(function () {
  'use strict';

  /* === Traduções PT/EN === */
  const TRANSLATIONS = {
    pt: {
      // Frases rotativas do hero
      heroPhrases: [
        'Propagação Digital — fazemos o seu negócio decolar na internet.',
        'Aqui o seu negócio ganha vida Online.',
        'Com a Propagação Digital — O seu negócio vende muito mais.'
      ],
    },
    en: {
      heroPhrases: [
        'Propagação Digital — we make your business take off online.',
        'Here your business comes alive online.',
        'With Propagação Digital — your business sells much more.'
      ],
    }
  };

  let currentLang = localStorage.getItem('pd-lang') || 'pt';

  /* === Sistema Bilíngue === */
  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('pd-lang', lang);

    // Atualizar <html>
    document.documentElement.setAttribute('lang', lang === 'pt' ? 'pt-BR' : 'en');
    document.documentElement.setAttribute('data-lang', lang);

    // Atualizar meta description
    document.querySelectorAll('meta[name="description"]').forEach(el => {
      const txt = el.getAttribute(`data-${lang}`);
      if (txt) el.setAttribute('content', txt);
    });
    document.querySelectorAll('meta[property^="og:"]').forEach(el => {
      const txt = el.getAttribute(`data-${lang}`);
      if (txt) el.setAttribute('content', txt);
    });

    // Trocar textos via data-pt / data-en
    document.querySelectorAll('[data-pt]').forEach(el => {
      const txt = el.getAttribute(`data-${lang}`);
      if (txt !== null) {
        // Preserve inner HTML for span-wrapped content
        el.innerHTML = txt;
      }
    });

    // Atualizar seletor visual
    document.querySelectorAll('[data-lang-flag]').forEach(span => {
      const flag = span.getAttribute('data-lang-flag');
      if (flag === lang) {
        span.classList.remove('lang-inactive');
        span.classList.add('lang-active');
      } else {
        span.classList.remove('lang-active');
        span.classList.add('lang-inactive');
      }
    });

    // Atualizar frases rotativas
    startRotatingPhrases();
  }

  /* === Frases rotativas no Hero === */
  let rotatingInterval = null;
  let phraseIndex = 0;

  function startRotatingPhrases() {
    if (rotatingInterval) clearInterval(rotatingInterval);
    phraseIndex = 0;
    const phrases = TRANSLATIONS[currentLang].heroPhrases;
    const target = document.getElementById('heroRotating');
    if (!target) return;

    // Set first phrase
    target.querySelector('span').textContent = phrases[0];

    rotatingInterval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      const span = target.querySelector('span');
      span.style.opacity = '0';
      setTimeout(() => {
        span.textContent = phrases[phraseIndex];
        span.style.opacity = '1';
      }, 400);
    }, 4000);
  }

  /* === Menu Mobile === */
  function setupMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      nav.classList.toggle('open');
    });

    // Fechar menu ao clicar em link
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        nav.classList.remove('open');
      });
    });
  }

  /* === Header scroll effect === */
  function setupHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;
    const onScroll = () => {
      if (window.scrollY > 30) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* === Reveal animations === */
  function setupReveal() {
    const targets = document.querySelectorAll(
      '.section-title, .section-sub, .eyebrow, .service-card, .case-card, ' +
      '.process-step, .diff-item, .faq-item, .visual-card, .col-text, ' +
      '.hero-badge, .hero-cta, .hero-stats, .cases-cta, .cta-title, .cta-sub, ' +
      '.cta-buttons, .cta-contact-info, .footer-brand, .footer-col'
    );

    targets.forEach(el => el.classList.add('reveal'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger animation
          setTimeout(() => entry.target.classList.add('visible'), i * 60);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    targets.forEach(el => observer.observe(el));
  }

  /* === Smooth scroll for anchors === */
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const headerHeight = 70;
          const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  /* === Lang switch button === */
  function setupLangSwitch() {
    const btn = document.getElementById('langSwitch');
    if (!btn) return;
    btn.addEventListener('click', () => {
      applyLang(currentLang === 'pt' ? 'en' : 'pt');
    });
  }

  /* === Init === */
  document.addEventListener('DOMContentLoaded', () => {
    applyLang(currentLang);
    setupMobileMenu();
    setupHeaderScroll();
    setupReveal();
    setupSmoothScroll();
    setupLangSwitch();
  });
})();
