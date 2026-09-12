(() => {
  'use strict';
  const dictionary = window.SCE_TRANSLATIONS || {};
  const languageSelect = document.getElementById('language');
  const menuToggle = document.getElementById('menu-toggle');
  const navigation = document.getElementById('navigation');
  const serviceMenu = document.querySelector('.service-menu');
  const mobileMenu = window.matchMedia('(max-width: 760px)');
  let language = 'ko';
  const t = key => dictionary[language]?.[key] || dictionary.ko?.[key] || key;

  function closeMenu(returnFocus = false) {
    navigation.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', t('menuOpen'));
    serviceMenu.open = false;
    if (returnFocus) menuToggle.focus();
  }
  function applyLanguage(nextLanguage, persist = false) {
    if (!dictionary[nextLanguage]) return;
    language = nextLanguage;
    document.documentElement.lang = language;
    languageSelect.value = language;
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.dataset.i18n;
      if (dictionary[language]?.[key]) element.textContent = t(key);
    });
    for (const [attribute, target] of [['data-i18n-alt', 'alt'], ['data-i18n-aria', 'aria-label'], ['data-i18n-placeholder', 'placeholder']]) {
      document.querySelectorAll(`[${attribute}]`).forEach(element => {
        const key = element.getAttribute(attribute);
        if (dictionary[language]?.[key]) element.setAttribute(target, t(key));
      });
    }
    menuToggle.setAttribute('aria-label', t(menuToggle.getAttribute('aria-expanded') === 'true' ? 'menuClose' : 'menuOpen'));
    document.title = t('title');
    document.querySelector('meta[name="description"]').content = t('description');
    const formStatus = document.getElementById('form-status');
    if (formStatus.dataset.statusKey) formStatus.textContent = t(formStatus.dataset.statusKey);
    if (persist) {
      try { localStorage.setItem('sce_lang', language); } catch { /* Restricted storage should not prevent language selection. */ }
    }
    document.dispatchEvent(new CustomEvent('sce:languagechange', { detail: { language } }));
  }

  let preferred;
  try { preferred = localStorage.getItem('sce_lang'); } catch { /* Browser preference remains available. */ }
  if (!dictionary[preferred]) {
    preferred = (navigator.languages || [navigator.language]).map(value => value.split('-')[0]).find(value => dictionary[value]) || 'ko';
  }
  applyLanguage(preferred);
  languageSelect.addEventListener('change', () => applyLanguage(languageSelect.value, true));
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
    if (!expanded) return closeMenu();
    navigation.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', t('menuClose'));
    navigation.querySelector('a').focus();
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (menuToggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
      else if (serviceMenu.open) {
        serviceMenu.open = false;
        serviceMenu.querySelector('summary').focus();
      }
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.header')) closeMenu();
    else if (!event.target.closest('.service-menu')) serviceMenu.open = false;
  });
  document.addEventListener('focusin', event => {
    if (!event.target.closest('.header') && menuToggle.getAttribute('aria-expanded') === 'true') closeMenu();
  });
  mobileMenu.addEventListener('change', () => closeMenu());
  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', () => { document.getElementById('contact-service').value = link.dataset.service; });
  });
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  function setStatus(key) {
    status.dataset.statusKey = key;
    status.textContent = t(key);
  }
  function inquiry() {
    const values = new FormData(form);
    const service = form.elements.service.selectedOptions[0].textContent;
    const body = [
      `${t('name')}: ${String(values.get('name')).trim()}`,
      `${t('email')}: ${String(values.get('email')).trim()}`,
      `${t('phone')}: ${String(values.get('phone')).trim() || '—'}`,
      `${t('service')}: ${service}`, '',
      t('message'), String(values.get('message')).trim(),
    ].join('\r\n');
    return { subject: `${t('mailSubject')} — ${service}`, body };
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const { subject, body } = inquiry();
    setStatus('mailOpened');
    // This opens a draft only; the visitor explicitly sends from their email client.
    window.location.href = `mailto:info@scenergy.co.kr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  document.getElementById('copy-inquiry').addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const { subject, body } = inquiry();
    const text = `info@scenergy.co.kr\r\n${subject}\r\n\r\n${body}`;
    const existingFallback = form.querySelector('.copy-fallback');
    if (existingFallback) existingFallback.remove();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setStatus('copySuccess');
    } catch {
      setStatus('copyFailed');
      const fallback = document.createElement('div');
      fallback.className = 'copy-fallback';
      fallback.tabIndex = 0;
      fallback.textContent = text;
      form.append(fallback);
      fallback.focus();
      const range = document.createRange();
      range.selectNodeContents(fallback);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });

  // Defer the optional renderer until the essential page is visible. Navigation,
  // translations and contact actions do not depend on WebGL or module loading.
  const startScene = () => import('./solar-scene.js?v=20260912-2').then(module => module.initSolarScene()).catch(() => {
    document.getElementById('solar-scene').classList.remove('scene-ready');
    document.getElementById('scene-toggle').hidden = true;
  });
  if ('requestIdleCallback' in window) requestIdleCallback(startScene, { timeout: 1200 });
  else setTimeout(startScene, 100);
  const startSections = () => import('./section-scenes.js?v=20260912-2').then(module => module.initSectionScenes()).catch(() => {
    document.querySelectorAll('.scene-motion').forEach(button => { button.hidden = true; });
  });
  if ('requestIdleCallback' in window) requestIdleCallback(startSections, { timeout: 1600 });
  else setTimeout(startSections, 250);
})();
