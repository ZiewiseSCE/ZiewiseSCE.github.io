(() => {
  'use strict';
  const data = window.SCE_IMPACT;
  const host = document.getElementById('impact-vision');
  const dialog = document.getElementById('impact-method');
  const film = document.getElementById('vision-film');
  if (!data || !host || !dialog || !film) return;
  const dictionary = window.SCE_TRANSLATIONS;
  const labels = {
    ko: {
      impactEstimate: 'GREEN ENERGY, GROWING TOGETHER', impactCapacity: '태양광 규모 환산', impactCarbon: '연간 저감 잠재량', impactTrees: '소나무 흡수량 환산', impactTreeUnit: '그루 상당', impactYearUnit: 'tCO₂e / 년',
      impactNote: '30년생 소나무의 1년 흡수량과 비교한 수치입니다.', impactMethod: '환산 기준 보기', impactClose: '닫기', impactTitle: '숫자에 담긴 기준',
      impactIntro: '태양광 규모를 기준으로 발전량과 환경 효과를 비교한 시나리오입니다. 검증된 시공 용량, 실제 발전량·탄소 감축량 또는 식재 실적을 뜻하지 않습니다.',
      impactScenarioCapacity: '비교 기준 태양광 규모',
      impactFormula: '약 30.9MW 상당의 태양광 규모를 기준으로, 연간 발전량은 1kW당 1,200kWh를 가정했습니다. 환경 효과를 비교하기 위한 환산값이며 실제 운영 상태나 발전 실적을 나타내지 않습니다.',
      impactCarbonBasis: '환산 발전량 × 0.4173tCO₂e/MWh. 기후에너지환경부가 2025년 12월 공표한 2023년 소비단 전력배출계수를 사용했습니다. 제조·시공 등 전과정 배출량, 실제 설치 시점과 운영 상태는 반영하지 않은 전력 대체 잠재량입니다.',
      impactTreeBasis: '연간 저감 잠재량 × 1,000 ÷ 6.6kg. 30년생 소나무 1그루의 연간 CO₂ 흡수량을 비교 기준으로 사용했습니다. 화면의 숲은 이 효과를 상징하며, 실제 심은 나무 수와는 다릅니다.',
      impactSources: '자료 출처', impactGridSource: '국가 전력배출계수 · 기후에너지환경부', impactPineSource: '소나무 연간 흡수량 · 한국 기후변화 평가보고서 2014, 표 4.4', impactAsOf: '자료 확인: 2026.09.13', impactGeneration: '가정한 연간 발전량',
    },
    en: {
      impactEstimate: 'GREEN ENERGY, GROWING TOGETHER', impactCapacity: 'Solar capacity equivalent', impactCarbon: 'Annual reduction potential', impactTrees: 'Pine absorption equivalent', impactTreeUnit: 'trees equivalent', impactYearUnit: 'tCO₂e / year',
      impactNote: 'Compared with one year of absorption by 30-year-old pines.', impactMethod: 'Calculation basis', impactClose: 'Close', impactTitle: 'The basis behind the numbers',
      impactIntro: 'A scenario comparing solar capacity with generation and environmental benefits. These figures are not verified installations, measured output, achieved reductions or actual tree planting.',
      impactScenarioCapacity: 'Solar capacity for comparison',
      impactFormula: 'The comparison uses approximately 30.9 MW of solar capacity and an assumed annual yield of 1,200 kWh per kW. This environmental comparison does not represent actual plant operation or measured generation.',
      impactCarbonBasis: 'Equivalent annual generation × 0.4173 tCO₂e/MWh, using the 2023 Korean consumption-side electricity factor announced in December 2025. This is electricity displacement potential; lifecycle emissions, commissioning dates and actual operating conditions are excluded.',
      impactTreeBasis: 'Annual reduction potential × 1,000 ÷ 6.6 kg, compared with annual CO₂ absorption by one 30-year-old pine. The animated forest symbolizes this comparison; it does not count trees actually planted.',
      impactSources: 'Sources', impactGridSource: 'National electricity factor · Korean climate ministry', impactPineSource: 'Annual pine absorption · Korea Climate Change Assessment 2014, Table 4.4', impactAsOf: 'Checked: 13 September 2026', impactGeneration: 'Assumed annual generation',
    },
    ja: {
      impactEstimate: 'GREEN ENERGY, GROWING TOGETHER', impactCapacity: '太陽光設備容量に換算', impactCarbon: '年間削減ポテンシャル', impactTrees: 'マツの吸収量に換算', impactTreeUnit: '本相当', impactYearUnit: 'tCO₂e / 年',
      impactNote: '樹齢30年のマツの年間吸収量との比較です。', impactMethod: '算定基準を見る', impactClose: '閉じる', impactTitle: '数字の算定基準',
      impactIntro: '太陽光設備容量を基準に発電量と環境効果を比較したシナリオです。検証済みの施工容量、実測発電量、実際の排出削減量や植樹実績を示すものではありません。',
      impactScenarioCapacity: '比較基準の太陽光設備容量',
      impactFormula: '約30.9MW相当の太陽光設備容量を基準に、年間発電量は1kW当たり1,200kWhと仮定しました。環境効果の比較のための換算値であり、実際の運転状況や発電実績ではありません。',
      impactCarbonBasis: '換算年間発電量 × 0.4173tCO₂e/MWh。韓国の気候エネルギー環境部が2025年12月に公表した2023年消費端電力排出係数を使用。製造・施工などのライフサイクル排出、稼働開始時期、実際の運転状況を含まない電力代替ポテンシャルです。',
      impactTreeBasis: '年間削減ポテンシャル × 1,000 ÷ 6.6kg。樹齢30年のマツ1本の年間CO₂吸収量と比較しています。映像の森はこの効果を象徴し、実際の植樹本数ではありません。',
      impactSources: '出典', impactGridSource: '国の電力排出係数 · 韓国気候エネルギー環境部', impactPineSource: 'マツの年間吸収量 · 韓国気候変動評価報告書2014、表4.4', impactAsOf: '確認日：2026年9月13日', impactGeneration: '仮定した年間発電量',
    },
  };
  for (const [lang, text] of Object.entries(labels)) Object.assign(dictionary[lang], text);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let finished = false;
  let rendered = '';
  const formatter = (value, compact = false, decimals = 0) => new Intl.NumberFormat(document.documentElement.lang || 'ko', { notation: compact ? 'compact' : 'standard', maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);
  const smooth = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  function numbers() {
    const still = reduced.matches || navigator.connection?.saveData || ['fallback', 'autoplay-blocked', 'still'].includes(document.getElementById('hero').dataset.visionState);
    const t = film.currentTime;
    // The counters accumulate once, then retain the completed scenario while the
    // decorative construction film repeats. They are not a live production feed.
    if (t >= 35.5 || still) finished = true;
    const renderKey = finished ? (document.documentElement.lang || 'ko') : '';
    if (renderKey && rendered === renderKey) return;
    rendered = renderKey;
    const solar = finished ? 1 : smooth(13.6, 19, t);
    const forest = finished ? 1 : smooth(26, 35.5, t);
    host.querySelector('[data-impact="capacity"]').textContent = formatter(data.capacityKw / 1000 * solar, false, 1);
    host.querySelector('[data-impact="carbon"]').textContent = formatter(data.annualTco2e * forest);
    host.querySelector('[data-impact="trees"]').textContent = formatter(data.equivalentPines * forest, true, 1);
    host.querySelector('.impact-values').setAttribute('aria-label', `${dictionary[document.documentElement.lang]?.impactEstimate || labels.ko.impactEstimate}: ${formatter(data.capacityKw / 1000, false, 1)} MW, ${formatter(data.annualTco2e)} tCO₂e, ${formatter(data.equivalentPines)}.`);
  }
  function details() {
    dialog.querySelector('[data-impact-scenario-capacity]').textContent = `${formatter(data.capacityKw / 1000, false, 1)} MW`;
    dialog.querySelector('[data-impact-generation]').textContent = `${formatter(data.annualMwh)} MWh / ${document.documentElement.lang === 'ko' ? '년' : document.documentElement.lang === 'ja' ? '年' : 'year'}`;
    for (const link of dialog.querySelectorAll('[data-impact-source]')) link.href = data.sources[link.dataset.impactSource];
    numbers();
  }
  host.querySelector('[data-impact-open]').addEventListener('click', () => dialog.showModal());
  dialog.querySelector('[data-impact-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  film.addEventListener('timeupdate', numbers);
  film.addEventListener('error', () => { finished = true; numbers(); });
  new MutationObserver(numbers).observe(document.getElementById('hero'), { attributes: true, attributeFilter: ['data-vision-state'] });
  document.addEventListener('sce:languagechange', details);
  reduced.addEventListener('change', numbers);
  details();
})();
