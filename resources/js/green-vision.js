(() => {
  'use strict';
  const translations = {
    ko: { visionConcept: '자연과 에너지가 함께 자라는 미래 · 콘셉트 필름', visionDescription: '건물의 기초와 철골, 외장과 태양광 패널, ESS와 전기차 충전소가 설치되고 숲이 자랍니다. 완공 후 태양이 움직이며 아침부터 밤으로 이어집니다. 낮에는 태양광 전력을 사용하고 여유 전력을 ESS에 저장합니다. 밤에는 저장 전력으로 건물과 충전소를 공급하며 SC Energy 네온 사인과 조명이 켜집니다. 설비와 사용 조건에 따라 달라지는 운영 예시입니다.' },
    en: { visionConcept: 'Nature and energy, growing together · Concept film', visionDescription: 'Foundations, steel, facade, solar panels, ESS and EV charging are installed, then a forest grows. The completed campus moves from morning to night under a traveling sun. Solar supplies on-site loads and charges storage by day. Stored energy powers the building, EV charging, lights and the SC Energy neon sign after dark. This is illustrative operation, dependent on equipment and demand.' },
    ja: { visionConcept: '自然とエネルギーが、ともに育つ未来 · コンセプト映像', visionDescription: '基礎、鉄骨、外装、太陽光パネル、ESS、EV充電設備を施工し、森が育ちます。完成後は太陽が移動し、朝から夜へ。昼は太陽光電力を使い、余剰電力をESSに蓄えます。夜は蓄電した電力を建物と充電設備へ供給し、SC Energyのネオンサインと照明が点灯します。設備や使用条件により異なる運転イメージです。' },
  };
  for (const [lang, labels] of Object.entries(translations)) Object.assign(window.SCE_TRANSLATIONS[lang], labels);
  const hero = document.getElementById('hero');
  const film = document.getElementById('vision-film');
  if (!hero || !film) return;
  const landscape = hero.querySelector('.hero-landscape');
  const poster = hero.querySelector('.vision-poster img');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const media = 'resources/media/green-vision/';
  const compact = matchMedia('(max-width: 760px)').matches;
  const quality = compact || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType) ? '540' : '1080';
  let inView = false;
  let failed = false;
  let starting = false;
  const motionAllowed = () => !reduced.matches && connection?.saveData !== true;
  const visible = () => inView && !document.hidden && !hero.closest('[hidden]');
  function showStill(state = 'still') {
    film.pause(); film.classList.remove('is-visible');
    poster.src = `${media}energy-complete.webp`;
    hero.dataset.visionState = state;
  }
  async function sync() {
    if (failed) return;
    if (!motionAllowed()) { showStill(); return; }
    if (!visible()) { film.pause(); return; }
    if (starting || !film.paused) return;
    if (!film.getAttribute('src')) {
      film.muted = true; film.defaultMuted = true; film.loop = true;
      film.src = `${media}energy-construction-${quality}.mp4?v=20260913-5`; film.load();
    }
    starting = true;
    try {
      await film.play();
      // Routes can change while the first frame is being decoded.
      if (!visible() || !motionAllowed()) film.pause();
    } catch (error) {
      if (!failed && error.name !== 'AbortError' && visible()) showStill('autoplay-blocked');
    } finally { starting = false; }
  }
  function checkVisibility() {
    const rect = landscape.getBoundingClientRect();
    inView = rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
    sync();
  }
  film.addEventListener('playing', () => {
    if (!visible() || !motionAllowed()) { film.pause(); return; }
    film.classList.add('is-visible'); hero.dataset.visionState = 'playing';
  });
  film.addEventListener('error', () => { failed = true; showStill('fallback'); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, { threshold: .01 }).observe(landscape);
  } else window.addEventListener('scroll', checkVisibility, { passive: true });
  window.addEventListener('hashchange', () => requestAnimationFrame(checkVisibility));
  window.addEventListener('pageshow', checkVisibility);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  checkVisibility();
})();
