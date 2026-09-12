(() => {
  'use strict';
  const hero = document.getElementById('hero');
  const film = document.getElementById('vision-film');
  const card = document.getElementById('energy-cycle');
  if (!hero || !film || !card) return;
  const labels = {
    ko: {
      energyCycleLabel: '태양광과 ESS가 연결하는 하루', energyExample: '운영 예시',
      energyBasis: '운영 예시 · 일사량·저장 용량·사용량에 따라 달라집니다.', energyStored: 'ESS 잔량 예시',
      morning: ['아침', '햇빛으로 하루를 시작합니다.', '태양광 → 건물·충전소 · 여유 전력은 ESS로', '충전 시작'],
      day: ['낮', '지금 쓰고, 남은 에너지는 저장.', '태양광 → 건물·충전소 + ESS 충전', '충전 중'],
      evening: ['저녁', '해가 지면, 저장한 에너지로.', 'ESS → 건물·충전소 · 조명과 사인 점등', '저장 전력 공급'],
      night: ['밤', '낮의 햇빛이, 밤의 전력이 됩니다.', 'ESS → 건물·충전소 · 태양광 발전은 휴식', '저장 전력 사용'],
      still: ['SOLAR + ESS', '낮에는 저장하고, 밤에는 사용.', '낮: 태양광 사용·ESS 충전 / 밤: 저장 전력 공급', '에너지 순환'],
    },
    en: {
      energyCycleLabel: 'A day connected by solar and storage', energyExample: 'Illustrative operation',
      energyBasis: 'Illustrative · Varies with sunlight, storage capacity and demand.', energyStored: 'Illustrative ESS charge',
      morning: ['Morning', 'A new day, powered by sunlight.', 'Solar → building & EVs · surplus → ESS', 'Charging begins'],
      day: ['Daytime', 'Use it now. Store the surplus.', 'Solar → building & EVs + ESS charging', 'Charging'],
      evening: ['Evening', 'Stored energy takes over at dusk.', 'ESS → building & EVs · lights and sign switch on', 'Supplying power'],
      night: ['Night', 'Daylight becomes power after dark.', 'ESS → building & EVs · solar generation rests', 'Using stored energy'],
      still: ['SOLAR + ESS', 'Store by day. Use after dark.', 'Day: solar use & storage / Night: stored power', 'Energy cycle'],
    },
    ja: {
      energyCycleLabel: '太陽光とESSがつなぐ一日', energyExample: '運転イメージ',
      energyBasis: '運転イメージ · 日射量・蓄電容量・使用量により異なります。', energyStored: 'ESS残量の例',
      morning: ['朝', '太陽の光で、一日が始まる。', '太陽光 → 建物・EV充電 · 余剰電力はESSへ', '充電開始'],
      day: ['昼', '今使い、余った電力を蓄える。', '太陽光 → 建物・EV充電 + ESSへの充電', '充電中'],
      evening: ['夕方', '日が沈むと、蓄えた電力へ。', 'ESS → 建物・EV充電 · 照明とサインが点灯', '蓄電した電力を供給'],
      night: ['夜', '昼の太陽が、夜の電力になる。', 'ESS → 建物・EV充電 · 太陽光発電は休止', '蓄電した電力を使用'],
      still: ['SOLAR + ESS', '昼に蓄え、夜に使う。', '昼：太陽光を使用・蓄電 / 夜：蓄電した電力を供給', 'エネルギー循環'],
    },
  };
  for (const [lang, values] of Object.entries(labels)) {
    for (const key of ['energyCycleLabel', 'energyExample', 'energyBasis', 'energyStored']) window.SCE_TRANSLATIONS[lang][key] = values[key];
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stacked = matchMedia('(max-width: 1100px)');
  const smooth = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  const elements = Object.fromEntries(['phase', 'title', 'flow', 'status', 'time', 'percent', 'battery'].map(key => [key, card.querySelector(`[data-energy-${key}]`)]));
  const setText = (element, value) => { if (element.textContent !== value) element.textContent = value; };
  let lastBattery = '', lastChargeLabel = '';
  let previous = '';
  const isStill = () => reduced.matches || navigator.connection?.saveData || ['fallback', 'autoplay-blocked', 'still'].includes(hero.dataset.visionState);
  function update() {
    const t = film.currentTime;
    const still = isStill();
    const summary = still || t < 38.5 || t >= 60.7;
    const shown = still || stacked.matches || !summary;
    if (card.hidden === shown) card.hidden = !shown;
    const phase = summary ? 'still' : t < 44 ? 'morning' : t < 52 ? 'day' : t < 56 ? 'evening' : 'night';
    const lang = document.documentElement.lang in labels ? document.documentElement.lang : 'ko';
    const text = labels[lang];
    if (`${lang}:${phase}` !== previous) {
      previous = `${lang}:${phase}`;
      [elements.phase.textContent, elements.title.textContent, elements.flow.textContent, elements.status.textContent] = text[phase];
      card.dataset.phase = phase;
      card.setAttribute('aria-label', text.energyCycleLabel);
    }
    const charge = t < 52 ? 22 + 70 * smooth(39, 52, t) : t < 56 ? 92 - 17 * smooth(52, 56, t) : 75 - 47 * smooth(56, 60.5, t);
    const soc = Math.round(charge);
    setText(elements.percent, summary ? 'ESS' : `${soc}%`);
    const battery = summary ? '.7' : (charge / 100).toFixed(3);
    if (battery !== lastBattery) { lastBattery = battery; elements.battery.style.setProperty('--charge', battery); }
    const chargeLabel = `${text.energyStored}: ${summary ? 'ESS' : soc + '%'}`;
    if (chargeLabel !== lastChargeLabel) { lastChargeLabel = chargeLabel; elements.battery.setAttribute('aria-label', chargeLabel); }
    const hour = t < 44 ? 7 + 3 * smooth(39, 44, t) : t < 52 ? 10 + 6 * smooth(44, 52, t) : t < 56 ? 16 + 3 * smooth(52, 56, t) : 19 + 4 * smooth(56, 60.5, t);
    setText(elements.time, summary ? '24h' : `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 4) * 15).padStart(2, '0')}`);
    // Playback never resizes or pans the media element. All camera motion lives
    // in the native 24 fps film, so its entry and reset cannot trigger layout.
  }
  film.addEventListener('timeupdate', update);
  film.addEventListener('seeked', update);
  film.addEventListener('error', update);
  document.addEventListener('sce:languagechange', () => { previous = ''; update(); });
  new MutationObserver(update).observe(hero, {attributes: true, attributeFilter: ['data-vision-state']});
  reduced.addEventListener('change', update);
  stacked.addEventListener('change', update);
  update();
})();
