(() => {
  'use strict';
  const dictionary = window.SCE_TRANSLATIONS;
  const labels = {
    ko: { visionLine: '숲이 자라고, 에너지가 이어지는 미래.', visionStages: '친환경 비전 영상 장면', visionForest: '자라나는 숲', visionStorage: 'ESS 에너지 저장', visionMobility: '전기차 충전', visionPause: '배경 정지', visionPlay: '배경 재생', visionReplay: '배경 영상 처음부터 재생', visionConcept: 'SCEnergy의 친환경 비전을 표현한 콘셉트 영상' },
    en: { visionLine: 'A growing forest. A connected energy future.', visionStages: 'Green vision film chapters', visionForest: 'Forest renewal', visionStorage: 'ESS storage', visionMobility: 'EV charging', visionPause: 'Pause film', visionPlay: 'Play film', visionReplay: 'Replay the background film', visionConcept: 'A concept film illustrating SCEnergy’s green vision' },
    ja: { visionLine: '森が育ち、エネルギーがつながる未来。', visionStages: '環境ビジョン映像のシーン', visionForest: '育つ森', visionStorage: 'ESS 蓄電', visionMobility: 'EV 充電', visionPause: '背景を停止', visionPlay: '背景を再生', visionReplay: '背景映像を最初から再生', visionConcept: 'SCEnergyの環境ビジョンを表現したコンセプト映像' },
  };
  for (const lang of Object.keys(labels)) Object.assign(dictionary[lang], labels[lang]);
  const hero = document.getElementById('hero');
  const intro = document.getElementById('vision-intro');
  const idle = document.getElementById('vision-idle');
  const toggle = document.getElementById('vision-toggle');
  if (!hero || !intro || !idle || !toggle) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData === true;
  const files = 'resources/media/green-vision/';
  const slowConnection = ['slow-2g', '2g', '3g'].includes(navigator.connection?.effectiveType);
  const quality = matchMedia('(max-width: 760px)').matches || slowConnection || saveData ? '540' : '1080';
  const videos = [intro, idle];
  const stageButtons = [...hero.querySelectorAll('[data-vision-stage]')];
  let active = intro;
  let paused = reduced.matches || saveData;
  let userOverride = false;
  let inView = false;
  let failed = false;
  let idlePrepared = false;
  let transition = 0;
  let observer;
  const t = key => dictionary[document.documentElement.lang]?.[key] || dictionary.ko[key];
  const allowed = () => !paused && !failed && inView && !document.hidden && !hero.closest('[hidden]');
  function updateControl() {
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.querySelector('.vision-control-icon').textContent = paused ? '▷' : 'Ⅱ';
    const label = toggle.querySelector('[data-i18n]');
    label.dataset.i18n = paused ? 'visionPlay' : 'visionPause';label.textContent = t(label.dataset.i18n);
    hero.dataset.visionPaused = String(paused);
  }
  function setStage(index, progress = 0) {
    stageButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    hero.dataset.visionStage = String(index);
    hero.querySelector('.vision-progress > span').style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
  }
  function load(video) {
    if (video.getAttribute('src')) return;
    const mode = video === intro ? 'intro' : 'idle';
    video.src = `${files}green-${mode}-${quality}.mp4`;
    video.muted = true;video.defaultMuted = true;video.load();
  }
  function reveal(video) {
    if (video !== active || video.readyState < 2) return;
    videos.forEach(item => item.classList.toggle('is-visible', item === video));
    hero.dataset.visionState = video === intro ? 'growing' : 'living';
  }
  function fallback() {
    failed = true;paused = true;videos.forEach(video => { video.pause();video.classList.remove('is-visible'); });
    hero.dataset.visionState = 'fallback';
    hero.querySelector('.vision-poster img').src = `${files}green-forest.webp`;
    setStage(2, 1);stageButtons.forEach(button => { button.disabled = true; });updateControl();
  }
  async function play() {
    if (!allowed()) return;
    load(active);
    try { await active.play(); }
    catch (error) {
      // Visibility changes and chapter seeks can legitimately interrupt play().
      if (error.name === 'AbortError' || !allowed()) return;
      paused = true;updateControl();
    }
  }
  function sync() {
    if (allowed()) play();
    else videos.forEach(video => video.pause());
  }
  function observeVisibility() {
    const rect = hero.getBoundingClientRect();
    inView = !hero.closest('[hidden]') && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
    sync();
  }
  function prepareIdle() {
    if (idlePrepared) return;
    idlePrepared = true;load(idle);
  }
  function switchToIdle() {
    const current = ++transition;
    prepareIdle();
    const finish = () => {
      if (current !== transition) return;
      active = idle;idle.currentTime = 0;setStage(2, 1);
      // Keep the final introduction frame visible until the loop has decoded.
      if (allowed()) play();else reveal(idle);
    };
    if (idle.readyState >= 2) finish();else idle.addEventListener('loadeddata', finish, { once: true });
  }
  function seek(time, startPlayback = false) {
    if (failed) return;
    ++transition;videos.forEach(video => video.pause());active = intro;load(intro);
    if (startPlayback) { paused = false;userOverride = true;updateControl(); }
    const current = transition;
    const apply = () => {
      if (current !== transition) return;
      intro.currentTime = time;
      intro.addEventListener('seeked', () => { if (active === intro) { reveal(intro);sync(); } }, { once: true });
      if (Math.abs(intro.currentTime - time) < .01 && !intro.seeking) { reveal(intro);sync(); }
    };
    if (intro.readyState >= 1) apply();else intro.addEventListener('loadedmetadata', apply, { once: true });
  }
  for (const video of videos) {
    video.addEventListener('playing', () => reveal(video));
    video.addEventListener('error', fallback);
  }
  intro.addEventListener('timeupdate', () => {
    if (active !== intro) return;
    const time = intro.currentTime;
    setStage(time < 10 ? 0 : time < 13.2 ? 1 : 2, time / 24);
    if (time > 8 && !saveData) prepareIdle();
  });
  intro.addEventListener('ended', switchToIdle);
  toggle.addEventListener('click', () => { userOverride = true;paused = !paused;updateControl();observeVisibility(); });
  document.getElementById('vision-replay').addEventListener('click', () => seek(0, true));
  stageButtons.forEach((button, index) => button.addEventListener('click', () => { userOverride = true;seek([5, 12.4, 18.5][index]); }));
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting;sync(); }, { threshold: .01 });
    observer.observe(hero);
  } else window.addEventListener('scroll', observeVisibility, { passive: true });
  window.addEventListener('hashchange', () => requestAnimationFrame(observeVisibility));
  window.addEventListener('pageshow', observeVisibility);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('sce:languagechange', updateControl);
  reduced.addEventListener('change', event => {
    if (userOverride) return;
    paused = event.matches || saveData;updateControl();
    if (paused && !intro.getAttribute('src')) { hero.querySelector('.vision-poster img').src = `${files}green-forest.webp`;setStage(2, 1); }
    sync();
  });
  if (paused) { hero.querySelector('.vision-poster img').src = `${files}green-forest.webp`;setStage(2, 1); }
  updateControl();observeVisibility();
})();
