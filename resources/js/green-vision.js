(() => {
  'use strict';
  const translations = {
    ko: { visionConcept: '자연과 에너지가 함께 자라는 미래 · 콘셉트 필름', visionDescription: '건물의 기초와 철골, 외장과 태양광 패널이 차례로 설치되고 ESS와 전기차 충전소, 숲으로 이어지는 3D 건축 애니메이션.' },
    en: { visionConcept: 'Nature and energy, growing together · Concept film', visionDescription: 'An architectural 3D animation: foundations, steel structure, facade and solar panels are installed in sequence, followed by ESS storage, EV charging and a growing forest.' },
    ja: { visionConcept: '自然とエネルギーが、ともに育つ未来 · コンセプト映像', visionDescription: '基礎、鉄骨、外装、太陽光パネルを順に施工し、ESS蓄電設備、EV充電ステーション、育つ森へとつながる3D建築アニメーション。' },
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
      film.src = `${media}energy-construction-${quality}.mp4`; film.load();
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
