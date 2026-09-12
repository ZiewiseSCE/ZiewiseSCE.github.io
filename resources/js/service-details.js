(() => {
  'use strict';
  const content = window.SCE_SERVICE_CONTENT;
  if (!content?.ko || !window.SCE_TRANSLATIONS) return;
  const ids = ['modules', 'rooftop', 'pvsyst', 'drone', 'cctv'];
  const main = document.getElementById('main');
  const homeSections = [...main.children];
  const dictionaries = window.SCE_TRANSLATIONS;
  const fallbackUi = {
    ko: { directoryExplore: '사업 자세히 보기', directoryIntro: '어떤 과제를 해결하고 싶으신가요? 사업을 선택하면 구조와 작동 원리를 3D로 살펴보고, 우리 현장에 필요한 솔루션을 자세히 확인할 수 있습니다.', experienceTitle: '구조를 보면, 선택이 쉬워집니다.', experienceIntro: '아래 항목을 선택해 3D와 함께 핵심을 살펴보세요.', outcomes: '이 솔루션이 만드는 차이', inquiryHint: '현장 조건부터 함께 살펴보겠습니다.' },
    en: { directoryExplore: 'Explore this service', directoryIntro: 'What would you like to solve? Choose a service to explore its components in 3D and understand what matters for your site.', experienceTitle: 'See how it works. Know what matters.', experienceIntro: 'Select a topic to explore the model and the decisions behind it.', outcomes: 'What this solution changes', inquiryHint: 'Let’s start with the conditions at your site.' },
    ja: { directoryExplore: '事業を詳しく見る', directoryIntro: 'どのような課題を解決したいですか。事業を選ぶと、構造や仕組みを3Dで確認し、現場に必要なソリューションを詳しくご覧いただけます。', experienceTitle: '仕組みが見えると、選び方が変わります。', experienceIntro: '項目を選び、3Dと解説で要点をご確認ください。', outcomes: 'このソリューションがもたらす価値', inquiryHint: 'まずは現場の条件を一緒に確認しましょう。' },
  };
  function flatten(value, prefix, target) {
    for (const [key, item] of Object.entries(value)) {
      const name = prefix ? `${prefix}.${key}` : key;
      if (typeof item === 'string') target[name] = item;
      else if (item && typeof item === 'object') flatten(item, name, target);
    }
  }
  for (const language of ['ko', 'en', 'ja']) {
    flatten(content[language], 'detail', dictionaries[language]);
    Object.assign(dictionaries[language], fallbackUi[language]);
    for (const id of ids) dictionaries[language][`directory_${id}`] = content[language][id].intro.split(/(?<=[.!?。])\s*/)[0];
  }
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const text = key => `<span data-i18n="${key}">${escape(dictionaries.ko[key] || key)}</span>`;
  const copy = (id, path) => text(`detail.${id}.${path}`);
  const ui = key => text(`detail.ui.${key}`);
  const numbered = index => String(index + 1).padStart(2, '0');
  const scene = id => `<div class="detail-model scene-frame" id="detail-scene-${id}" data-scene-frame="${id}" data-scene-focus="0">
    <div class="scene-heading"><span>${escape(content.ko[id].eyebrow)}</span><span class="scene-format">3D</span></div>
    <div id="detail-view-${id}" class="scene-stage" data-scene="${id}" role="img" data-i18n-aria="scene_${id}" aria-label="${escape(dictionaries.ko[`scene_${id}`])}">
      <img class="scene-poster" src="resources/images/renewal/${id}-focus-0.webp?v=20260912-4" alt="" width="1100" height="850" loading="lazy">
    </div>
    <button class="detail-reset" type="button" data-focus-reset="${id}" aria-controls="detail-view-${id}"><span aria-hidden="true">↺</span> ${ui('focusReset')}</button>
    <button class="scene-motion" type="button" aria-controls="detail-view-${id}" aria-pressed="false" disabled><span class="pause-label"><span aria-hidden="true">Ⅱ</span> ${text('pause')}</span><span class="play-label"><span aria-hidden="true">▷</span> ${text('play')}</span></button>
  </div>`;
  const pages = document.createElement('div');
  pages.id = 'service-pages';
  pages.hidden = true;
  pages.innerHTML = ids.map((id, serviceIndex) => {
    const service = content.ko[id];
    return `<article id="${id}" class="service-page" data-service-page="${id}" hidden aria-labelledby="${id}-heading">
      <div class="detail-topline container"><a href="#services" class="detail-back"><span aria-hidden="true">←</span> ${ui('allServices')}</a><span class="detail-index">SCE SOLUTIONS / ${numbered(serviceIndex)}</span></div>
      <nav class="detail-service-nav container" aria-label="${escape(dictionaries.ko['detail.ui.sectionNavigation'])}" data-i18n-aria="detail.ui.sectionNavigation">${ids.map(slug => `<a href="#${slug}"${slug === id ? ' aria-current="page"' : ''}>${copy(slug, 'label')}</a>`).join('')}</nav>
      <section class="detail-intro container">
        <div><div class="section-kicker">${escape(service.eyebrow)}</div><p class="detail-category">${copy(id, 'label')}</p><h1 id="${id}-heading" tabindex="-1">${copy(id, 'title')}</h1></div>
        <div class="detail-intro-copy"><p>${copy(id, 'intro')}</p><a class="button primary" href="#contact" data-service="${id}">${ui('inquire')} <span aria-hidden="true">↗</span></a></div>
      </section>
      <section class="detail-experience container" aria-labelledby="${id}-experience-heading">
        <div class="detail-model-column"><div class="detail-model-sticky">${scene(id)}<div class="detail-model-caption"><span class="detail-concept-dot" aria-hidden="true"></span><p>${copy(id, 'focus.0.title')}</p></div><p class="detail-model-note">${ui('modelNote')}</p></div></div>
        <div class="detail-explainer"><div class="section-kicker">01 — INSIDE THE SOLUTION</div><h2 id="${id}-experience-heading">${text('experienceTitle')}</h2><p class="detail-experience-intro">${text('experienceIntro')}</p>
          <div class="detail-focus-list">${service.focus.map((topic, index) => `<div class="detail-focus-item${index === 0 ? ' is-selected' : ''}"><h3><button type="button" id="${id}-focus-button-${index}" data-focus-service="${id}" data-focus-index="${index}" aria-expanded="${index === 0}" aria-controls="${id}-focus-copy-${index}"><span class="detail-focus-number">${numbered(index)}</span><span>${copy(id, `focus.${index}.title`)}</span><span class="detail-focus-arrow" aria-hidden="true">↗</span></button></h3><div class="detail-focus-copy" id="${id}-focus-copy-${index}" role="region" aria-labelledby="${id}-focus-button-${index}"${index === 0 ? '' : ' hidden'}><p>${copy(id, `focus.${index}.text`)}</p></div></div>`).join('')}</div>
        </div>
      </section>
      <section class="detail-benefits container" aria-labelledby="${id}-benefits-heading"><div class="detail-section-label"><span>02</span><h2 id="${id}-benefits-heading">${text('outcomes')}</h2></div><div class="detail-benefit-grid">${service.benefits.map((benefit, index) => `<div class="detail-benefit"><span class="detail-benefit-mark" aria-hidden="true">${['↗', '◎', '↔'][index]}</span><h3>${copy(id, `benefits.${index}.title`)}</h3><p>${copy(id, `benefits.${index}.text`)}</p></div>`).join('')}</div></section>
      <section class="detail-scope container" aria-labelledby="${id}-scope-heading"><div class="detail-section-intro"><div class="section-kicker">03 — WHAT WE DELIVER</div><h2 id="${id}-scope-heading">${copy(id, 'scopeTitle')}</h2><p>${copy(id, 'scopeIntro')}</p></div><div class="detail-scope-grid">${service.scope.map((scope, index) => `<div class="detail-scope-item"><span>${numbered(index)}</span><div><h3>${copy(id, `scope.${index}.title`)}</h3><p>${copy(id, `scope.${index}.text`)}</p></div></div>`).join('')}</div></section>
      <section class="detail-why"><div class="container"><div class="detail-why-heading"><div><div class="section-kicker">04 — WHY SCE</div><h2>${copy(id, 'whyTitle')}</h2></div><p>${copy(id, 'whyIntro')}</p></div><div class="detail-reasons">${service.reasons.map((reason, index) => `<div><span class="detail-reason-number">${numbered(index)}</span><h3>${copy(id, `reasons.${index}.title`)}</h3><p>${copy(id, `reasons.${index}.text`)}</p></div>`).join('')}</div></div></section>
      <section class="detail-process container"><div class="section-kicker">05 — FROM QUESTION TO ACTION</div><h2>${ui('process')}</h2><ol>${service.process.map((step, index) => `<li><span class="detail-process-number">${numbered(index)}</span><h3>${copy(id, `process.${index}.title`)}</h3><p>${copy(id, `process.${index}.text`)}</p></li>`).join('')}</ol></section>
      <section class="detail-practical container"><div class="detail-fit"><div class="section-kicker">06 — IS THIS FOR YOU?</div><h2>${copy(id, 'fitTitle')}</h2><ul>${service.fit.map((fit, index) => `<li><span aria-hidden="true">↗</span>${copy(id, `fit.${index}`)}</li>`).join('')}</ul></div><div class="detail-faq"><h2>${ui('faq')}</h2>${service.faq.map((faq, index) => `<details><summary>${copy(id, `faq.${index}.question`)}<span aria-hidden="true">+</span></summary><p>${copy(id, `faq.${index}.answer`)}</p></details>`).join('')}</div></section>
      <section class="detail-cta container"><div><span class="section-kicker">LET’S FIND YOUR NEXT STEP</span><h2>${copy(id, 'ctaTitle')}</h2><p>${copy(id, 'ctaText')}</p></div><a class="button" href="#contact" data-service="${id}">${ui('inquire')}<span aria-hidden="true">↗</span></a></section>
    </article>`;
  }).join('');
  main.append(pages);
  let activeService = null;
  const language = () => document.documentElement.lang || 'ko';
  function setMetadata() {
    if (!activeService) return;
    const service = content[language()]?.[activeService] || content.ko[activeService];
    document.title = `${service.label} | SCEnergy`;
    document.querySelector('meta[name="description"]').content = service.intro;
  }
  function setFocus(id, index) {
    const page = document.getElementById(id);
    const frame = document.getElementById(`detail-scene-${id}`);
    frame.dataset.sceneFocus = String(index);
    frame.querySelector('.scene-poster').src = `resources/images/renewal/${id}${index < 0 ? '-3d' : `-focus-${index}`}.webp?v=20260912-4`;
    const caption = page.querySelector('.detail-model-caption [data-i18n]');
    caption.dataset.i18n = `detail.${id}.${index < 0 ? 'sceneCaption' : `focus.${index}.title`}`;
    caption.textContent = dictionaries[language()][caption.dataset.i18n];
    page.querySelectorAll('[data-focus-index]').forEach(button => {
      const selected = Number(button.dataset.focusIndex) === index;
      button.setAttribute('aria-expanded', String(selected));
      button.closest('.detail-focus-item').classList.toggle('is-selected', selected);
      document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
    });
    window.dispatchEvent(new CustomEvent('sce:scenefocus', { detail: { sceneId: frame.id, index } }));
    if (index >= 0 && matchMedia('(max-width: 760px)').matches) {
      requestAnimationFrame(() => {
        const button = page.querySelector(`[data-focus-index="${index}"]`);
        const visibleTop = document.getElementById('header').getBoundingClientRect().height + 16 + page.querySelector('.detail-model-column').offsetHeight;
        window.scrollTo({ top: Math.max(0, scrollY + button.getBoundingClientRect().top - visibleTop), behavior: 'instant' });
      });
    }
  }
  pages.addEventListener('click', event => {
    const button = event.target.closest('[data-focus-index], [data-focus-reset]');
    if (!button) return;
    setFocus(button.dataset.focusService || button.dataset.focusReset, button.hasAttribute('data-focus-reset') ? -1 : Number(button.dataset.focusIndex));
  });
  function route({ focus = false } = {}) {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
    const next = ids.includes(hash) ? hash : null;
    const previous = activeService;
    activeService = next;
    pages.hidden = !next;
    for (const section of homeSections) section.hidden = Boolean(next);
    for (const id of ids) document.getElementById(id).hidden = id !== next;
    document.body.dataset.serviceView = next || 'home';
    document.querySelectorAll('.service-dropdown a').forEach(link => {
      if (link.hash === `#${next}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.querySelector('.back-top').href = next ? `#${next}` : '#hero';
    document.querySelector('.skip-link').href = next ? `#${next}` : '#main';
    if (next) setMetadata();
    else {
      document.title = dictionaries[language()].title;
      document.querySelector('meta[name="description"]').content = dictionaries[language()].description;
      if (previous && hash === 'contact') document.getElementById('contact-service').value = previous;
    }
    requestAnimationFrame(() => {
      if (next) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (focus) document.getElementById(`${next}-heading`).focus({ preventScroll: true });
        const frame = document.getElementById(`detail-scene-${next}`);
        window.dispatchEvent(new CustomEvent('sce:scenefocus', { detail: { sceneId: frame.id, index: Number(frame.dataset.sceneFocus ?? 0) } }));
      } else if (hash && hash !== 'main') {
        const target = document.getElementById(hash);
        if (target && homeSections.includes(target)) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else if (previous) window.scrollTo({ top: 0, behavior: 'instant' });
      window.dispatchEvent(new Event('resize'));
    });
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    if (link.hash === location.hash && (ids.includes(link.hash.slice(1)) || link.hash === '#services')) {
      event.preventDefault();
      route({ focus: true });
    }
  });
  window.addEventListener('hashchange', () => route({ focus: true }));
  document.addEventListener('sce:languagechange', setMetadata);
  route();
})();
