(() => {
  'use strict';
  const content = window.SCE_SERVICE_CONTENT;
  const pages = document.getElementById('service-pages');
  if (!content || !pages) return;
  const dictionary = window.SCE_TRANSLATIONS;
  const labels = {
    ko: { storyHint: '항목을 선택하거나 자동 설명으로 살펴보세요.', storyPause: '자동 설명 정지', storyPlay: '자동 설명 재생', storyPrevious: '이전 설명', storyNext: '다음 설명', storyView: '설명과 연결된 3D 장면', storyConcept: '구조와 검토 과정을 보여주는 개념 3D입니다.' },
    en: { storyHint: 'Choose a topic or follow the animated walkthrough.', storyPause: 'Pause walkthrough', storyPlay: 'Play walkthrough', storyPrevious: 'Previous topic', storyNext: 'Next topic', storyView: '3D scene illustrating this topic', storyConcept: 'Conceptual 3D illustrating equipment and the review process.' },
    ja: { storyHint: '項目を選ぶか、自動解説でご覧ください。', storyPause: '自動解説を停止', storyPlay: '自動解説を再生', storyPrevious: '前の解説', storyNext: '次の解説', storyView: '解説と連動する3Dシーン', storyConcept: '設備の構造や検討の流れを示す概念3Dです。' },
  };
  for (const lang of Object.keys(labels)) Object.assign(dictionary[lang], labels[lang]);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const lang = () => document.documentElement.lang || 'ko';
  const t = key => dictionary[lang()]?.[key] || dictionary.ko[key] || key;
  const escape = str => String(str).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const word = key => `<span data-i18n="${key}">${escape(t(key))}</span>`;
  const groups = {
    benefits: { section: '.detail-benefits', list: '.detail-benefit-grid', items: '.detail-benefit', field: 'benefits' },
    scope: { section: '.detail-scope', list: '.detail-scope-grid', items: '.detail-scope-item', field: 'scope' },
    why: { section: '.detail-why > .container', list: '.detail-reasons', items: '.detail-reasons > div', field: 'reasons' },
    process: { section: '.detail-process', list: 'ol', items: 'ol > li', field: 'process' },
  };
  // Each paragraph points to the equipment or engineering activity it describes.
  const sequence = {
    modules: {
      benefits: [['modules', 0], ['modules', 2], ['modules', 3]],
      scope: [['modules', 0], ['modules', 2], ['modules', 1], ['modules', 3]],
      why: [['rooftop', 0], ['pvsyst', 1], ['drone', 3]],
      process: [['rooftop', 0], ['modules', 1], ['modules', 3], ['drone', 3]],
    },
    rooftop: {
      benefits: [['rooftop', 0], ['rooftop', 2], ['rooftop', 3]],
      scope: [['rooftop', 1], ['pvsyst', 0], ['rooftop', 0], ['rooftop', 2]],
      why: [['rooftop', 2], ['modules', 1], ['drone', 0]],
      process: [['rooftop', 0], ['pvsyst', 0], ['rooftop', 3], ['rooftop', 2]],
    },
    pvsyst: {
      benefits: [['pvsyst', 3], ['pvsyst', 2], ['pvsyst', 1]],
      scope: [['pvsyst', 0], ['pvsyst', 1], ['pvsyst', 2], ['pvsyst', 3]],
      why: [['pvsyst', 0], ['modules', 2], ['pvsyst', 3]],
      process: [['rooftop', 0], ['pvsyst', 0], ['pvsyst', 1], ['pvsyst', 3]],
    },
    drone: {
      benefits: [['drone', 0], ['drone', 2], ['drone', 3]],
      scope: [['drone', 0], ['drone', 1], ['drone', 2], ['drone', 3]],
      why: [['drone', 2], ['modules', 2], ['drone', 3]],
      process: [['rooftop', 0], ['drone', 0], ['drone', 2], ['drone', 3]],
    },
    cctv: {
      benefits: [['cctv', 1], ['cctv', 0], ['cctv', 3]],
      scope: [['cctv', 2], ['cctv', 1], ['cctv', 3], ['cctv', 2]],
      why: [['cctv', 1], ['cctv', 2], ['cctv', 0]],
      process: [['cctv', 2], ['cctv', 1], ['cctv', 3], ['cctv', 0]],
    },
  };
  const stories = [];
  const bySection = new Map();
  const poster = (kind, focus) => `resources/images/renewal/${kind}${focus < 0 ? '-3d' : `-focus-${focus}`}.webp?v=20260912-4`;
  for (const id of Object.keys(sequence)) {
    const page = document.getElementById(id);
    for (const [name, group] of Object.entries(groups)) {
      const section = page.querySelector(group.section);
      const list = section.querySelector(group.list);
      const items = [...section.querySelectorAll(group.items)];
      const frameId = `story-${id}-${name}`;
      const [kind, focus] = sequence[id][name][0];
      const key = index => `detail.${id}.${group.field}.${index}.title`;
      const pair = document.createElement('div');
      pair.className = `story-layout story-${name}`;
      const figure = document.createElement('figure');
      figure.className = 'story-visual';
      figure.innerHTML = `<div id="${frameId}" class="story-frame scene-frame" data-scene-frame="${kind}" data-scene-focus="${focus}" data-scene-paused="true">
        <div class="scene-heading"><span>${escape(content.ko[id].eyebrow)}</span><span class="scene-format">3D</span></div>
        <div id="${frameId}-view" class="scene-stage" data-scene="${kind}" role="img" data-i18n-aria="storyView" aria-label="${escape(t('storyView'))}"><img class="scene-poster" src="${poster(kind, focus)}" alt="" width="1100" height="850" loading="lazy"></div>
        <button class="scene-motion" hidden type="button" aria-controls="${frameId}-view" aria-pressed="true" disabled><span class="pause-label">${word('pause')}</span><span class="play-label">${word('play')}</span></button>
        <div class="story-diagram" aria-hidden="true">${items.map((_, i) => `<span class="story-node${i === 0 ? ' is-active' : ''}">${String(i + 1).padStart(2, '0')}</span>`).join('<span class="story-wire"></span>')}</div>
      </div>
      <figcaption class="story-caption"><div class="story-caption-heading"><span class="story-counter">01 / ${String(items.length).padStart(2, '0')}</span><strong>${word(key(0))}</strong></div><div class="story-controls"><button type="button" class="story-previous" data-i18n-aria="storyPrevious" aria-label="${escape(t('storyPrevious'))}">←</button><button type="button" class="story-toggle" aria-pressed="${motion.matches}" aria-controls="${frameId}-view">${word(motion.matches ? 'storyPlay' : 'storyPause')}</button><button type="button" class="story-next" data-i18n-aria="storyNext" aria-label="${escape(t('storyNext'))}">→</button></div></figcaption>
      <div class="story-progress" aria-hidden="true"><span></span></div><p class="story-note">${word('storyConcept')}</p>`;
      section.insertBefore(pair, list);
      pair.append(figure, list);
      list.classList.add('story-copy');
      section.classList.add('has-story');
      section.dataset.storySection = frameId;
      const hint = document.createElement('p');
      hint.className = 'story-hint';hint.innerHTML = word('storyHint');pair.before(hint);
      const story = { id, name, frameId, section, pair, figure, list, items, key, index: 0, phases: sequence[id][name], near: false, elapsed: 0, lastRunning: null, paused: motion.matches, userOverride: false, pointerHold: false, focusHold: false };
      items.forEach((item, index) => {
        const heading = item.querySelector('h3');
        const button = document.createElement('button');
        button.type = 'button';button.className = 'story-topic';button.dataset.storyIndex = String(index);
        button.setAttribute('aria-controls', `${frameId}-view`);button.setAttribute('aria-pressed', String(index === 0));
        while (heading.firstChild) button.append(heading.firstChild);
        const arrow = document.createElement('span');arrow.className = 'story-topic-arrow';arrow.setAttribute('aria-hidden', 'true');arrow.textContent = '↗';button.append(arrow);heading.append(button);
        item.classList.add('story-item');item.classList.toggle('is-active', index === 0);
        button.addEventListener('click', () => { select(story, index, true); wake(); });
      });
      figure.querySelector('.story-toggle').addEventListener('click', () => { story.paused = !story.paused;story.userOverride = true;syncControl(story);refresh(story);wake(); });
      figure.querySelector('.story-next').addEventListener('click', () => { select(story, (story.index + 1) % items.length, true);wake(); });
      figure.querySelector('.story-previous').addEventListener('click', () => { select(story, (story.index + items.length - 1) % items.length, true);wake(); });
      list.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') story.pointerHold = true; });
      list.addEventListener('pointerleave', () => { story.pointerHold = false;wake(); });
      list.addEventListener('focusin', () => { story.focusHold = true; });
      list.addEventListener('focusout', () => { queueMicrotask(() => { story.focusHold = list.contains(document.activeElement);wake(); }); });
      stories.push(story);bySection.set(figure, story);
    }
  }
  let timer = 0;
  let previousTime = 0;
  const cycleDuration = 7200;
  function select(story, index, manual = false) {
    if (index < 0 || index >= story.items.length) return;
    story.index = index;story.elapsed = 0;
    const [kind, focus] = story.phases[index];
    const frame = document.getElementById(story.frameId);
    frame.dataset.sceneFocus = String(focus);frame.dataset.sceneFrame = kind;
    frame.querySelector('[data-scene]').dataset.scene = kind;
    const img = frame.querySelector('.scene-poster');img.src = poster(kind, focus);
    const caption = story.figure.querySelector('.story-caption-heading strong span');caption.dataset.i18n = story.key(index);caption.textContent = t(caption.dataset.i18n);
    story.figure.querySelector('.story-counter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(story.items.length).padStart(2, '0')}`;
    story.items.forEach((item, i) => { item.classList.toggle('is-active', i === index);item.querySelector('.story-topic').setAttribute('aria-pressed', String(i === index)); });
    frame.querySelectorAll('.story-node').forEach((node, i) => node.classList.toggle('is-active', i === index));
    story.figure.querySelector('.story-progress > span').style.transform = 'scaleX(0)';
    window.dispatchEvent(new CustomEvent('sce:scenefocus', { detail: { sceneId: frame.id, index: focus, kind } }));
    if (manual && mobile.matches) requestAnimationFrame(() => {
      const button = story.items[index].querySelector('.story-topic');
      const top = document.getElementById('header').getBoundingClientRect().height + story.figure.offsetHeight + 21;
      window.scrollTo({ top: Math.max(0, scrollY + button.getBoundingClientRect().top - top), behavior: 'instant' });
    });
  }
  function syncControl(story) {
    const button = story.figure.querySelector('.story-toggle');
    button.setAttribute('aria-pressed', String(story.paused));
    const span = button.querySelector('span');span.dataset.i18n = story.paused ? 'storyPlay' : 'storyPause';span.textContent = t(span.dataset.i18n);
  }
  function running(story) { return story.near && !story.paused && !story.section.closest('[hidden]') && !document.hidden; }
  function refresh(story) {
    const active = running(story);
    story.section.classList.toggle('is-story-running', active);
    if (active === story.lastRunning) return;
    story.lastRunning = active;
    document.getElementById(story.frameId).dataset.scenePaused = String(!active);
    window.dispatchEvent(new CustomEvent('sce:scenepause', { detail: { sceneId: story.frameId, paused: !active } }));
  }
  function tick() {
    timer = 0;
    const time = performance.now();const delta = previousTime ? Math.min(time - previousTime, 200) : 0;previousTime = time;
    let needed = false;
    for (const story of stories) {
      refresh(story);
      if (!running(story)) continue;
      needed = true;
      if (story.pointerHold || story.focusHold) continue;
      story.elapsed += delta;
      if (story.elapsed >= cycleDuration) {
        // On narrow screens, keep the model tied to the paragraph being read.
        const next = (story.index + 1) % story.items.length;
        const bounds = story.items[next].getBoundingClientRect();
        if (!mobile.matches || (bounds.top < innerHeight && bounds.bottom > story.figure.getBoundingClientRect().bottom)) select(story, next);
        else story.elapsed = cycleDuration;
      }
      story.figure.querySelector('.story-progress > span').style.transform = `scaleX(${Math.min(story.elapsed / cycleDuration, 1)})`;
    }
    if (needed) timer = setTimeout(tick, 100);
    else previousTime = 0;
  }
  function wake() { if (!timer && !document.hidden) timer = setTimeout(tick, 40); }
  const observer = new IntersectionObserver(entries => { for (const entry of entries) { const story = bySection.get(entry.target);story.near = entry.isIntersecting;refresh(story); }wake(); }, { threshold: 0.08 });
  stories.forEach(story => observer.observe(story.figure));
  let scrollFrame = 0;
  function scroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      if (mobile.matches && !motion.matches) {
        for (const story of stories) {
          if (!story.near || story.paused || story.section.closest('[hidden]')) continue;
          const bottom = story.figure.getBoundingClientRect().bottom;
          const target = bottom + Math.min(64, Math.max(24, (innerHeight - bottom) * .18));
          const choices = story.items.map((item, index) => ({ index, rect: item.getBoundingClientRect() })).filter(x => x.rect.bottom > bottom + 30 && x.rect.top < innerHeight - 35);
          const reading = choices.find(x => x.rect.top <= target && x.rect.bottom > target)
            || choices.find(x => x.rect.top > target) || choices.at(-1);
          if (reading && reading.index !== story.index) select(story, reading.index);
        }
      }
      wake();
    });
  }
  window.addEventListener('scroll', scroll, { passive: true });
  window.addEventListener('hashchange', () => { stories.forEach(refresh);wake(); });
  document.addEventListener('visibilitychange', () => { if (timer) clearTimeout(timer);timer = 0;previousTime = 0;stories.forEach(refresh);wake(); });
  motion.addEventListener('change', () => { for (const story of stories) { if (!story.userOverride) story.paused = motion.matches;syncControl(story);refresh(story); }wake(); });
  document.addEventListener('sce:languagechange', () => stories.forEach(syncControl));
  const revealObserver = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('story-entered');revealObserver.unobserve(entry.target); } }); }, { threshold: .08 });
  stories.forEach(story => { story.section.classList.add('story-reveal');revealObserver.observe(story.section); });
  stories.forEach(refresh);wake();
})();
