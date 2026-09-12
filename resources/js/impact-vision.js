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
      impactEstimate: '공개된 5개 연도 매출 약 55.6억 원 · 추정 환산', impactCapacity: '태양광 규모 환산', impactCarbon: '연간 저감 잠재량', impactTrees: '소나무 흡수량 환산', impactTreeUnit: '그루 상당', impactYearUnit: 'tCO₂e / 년',
      impactNote: '30년생 소나무의 1년 흡수량과 비교한 수치입니다.', impactMethod: '환산 기준 보기', impactClose: '닫기', impactTitle: '숫자에 담긴 기준',
      impactIntro: '공개 매출을 회사가 지정한 단가로 태양광 규모에 환산한 시나리오입니다. 검증된 시공 용량, 누적 발전량, 실제 탄소 감축량 또는 식재 실적을 뜻하지 않습니다.',
      impactRevenue: '공개 매출 합계', impactCoverage: '집계 연도: 2019 · 2020 · 2021 · 2024 · 2025. 그 외 연도는 자료 미확인으로 제외했으며, 설립 이후 전체 매출 합계가 아닙니다. 2019년은 동일 기업 재무 페이지의 과거 공개 색인 자료를 사용했습니다.',
      impactFormula: '확인한 매출 합계 5,558,290,000원을 회사 지정 환산 단가 1MW당 1.8억 원(1W당 180원)으로 나누면 약 30.9MW 상당입니다. 전체 매출이 태양광 용량으로 환산된다고 가정했습니다. 연간 발전량은 1kW당 1,200kWh를 적용했습니다. 이 환산 단가는 발전소 전체 설치비 견적을 뜻하지 않으며 발전량도 가정값입니다.',
      impactCarbonBasis: '환산 발전량 × 0.4173tCO₂e/MWh. 기후에너지환경부가 2025년 12월 공표한 2023년 소비단 전력배출계수를 사용했습니다. 제조·시공 등 전과정 배출량, 실제 설치 시점과 운영 상태는 반영하지 않은 전력 대체 잠재량입니다.',
      impactTreeBasis: '연간 저감 잠재량 × 1,000 ÷ 6.6kg. 30년생 소나무 1그루의 연간 CO₂ 흡수량을 비교 기준으로 사용했습니다. 화면의 숲은 이 효과를 상징하며, 실제 심은 나무 수와는 다릅니다.',
      impactSources: '자료 출처', impactRevenueSource: '기업 재무정보 · 사람인 / NICE', impactGridSource: '국가 전력배출계수 · 기후에너지환경부', impactPineSource: '소나무 연간 흡수량 · 한국 기후변화 평가보고서 2014, 표 4.4', impactAsOf: '자료 확인: 2026.09.13', impactGeneration: '가정한 연간 발전량',
    },
    en: {
      impactEstimate: '5 reported fiscal years · KRW 5.56bn · Estimated', impactCapacity: 'Solar capacity equivalent', impactCarbon: 'Annual reduction potential', impactTrees: 'Pine absorption equivalent', impactTreeUnit: 'trees equivalent', impactYearUnit: 'tCO₂e / year',
      impactNote: 'Compared with one year of absorption by 30-year-old pines.', impactMethod: 'Calculation basis', impactClose: 'Close', impactTitle: 'The basis behind the numbers',
      impactIntro: 'Public revenue converted into a solar capacity scenario using a company-specified rate. These figures are not verified installations, cumulative generation, achieved emissions reductions or actual tree planting.',
      impactRevenue: 'Public revenue subtotal', impactCoverage: 'Fiscal years: 2019, 2020, 2021, 2024 and 2025. Other years are excluded because figures were not confirmed. This is not lifetime revenue. The 2019 amount comes from an earlier public search index of the same company finance page.',
      impactFormula: 'The KRW 5,558,290,000 revenue subtotal divided by the company-specified rate of KRW 180 million per MW (KRW 180/W) gives approximately 30.9 MW equivalent. All included revenue is assumed to convert into solar capacity. Annual yield is assumed at 1,200 kWh per kW. This conversion rate is not a quotation for a complete installed plant, and generation is an assumption.',
      impactCarbonBasis: 'Equivalent annual generation × 0.4173 tCO₂e/MWh, using the 2023 Korean consumption-side electricity factor announced in December 2025. This is electricity displacement potential; lifecycle emissions, commissioning dates and actual operating conditions are excluded.',
      impactTreeBasis: 'Annual reduction potential × 1,000 ÷ 6.6 kg, compared with annual CO₂ absorption by one 30-year-old pine. The animated forest symbolizes this comparison; it does not count trees actually planted.',
      impactSources: 'Sources', impactRevenueSource: 'Company financial information · Saramin / NICE', impactGridSource: 'National electricity factor · Korean climate ministry', impactPineSource: 'Annual pine absorption · Korea Climate Change Assessment 2014, Table 4.4', impactAsOf: 'Checked: 13 September 2026', impactGeneration: 'Assumed annual generation',
    },
    ja: {
      impactEstimate: '公開5期の売上約55.6億ウォン · 推定換算', impactCapacity: '太陽光設備容量に換算', impactCarbon: '年間削減ポテンシャル', impactTrees: 'マツの吸収量に換算', impactTreeUnit: '本相当', impactYearUnit: 'tCO₂e / 年',
      impactNote: '樹齢30年のマツの年間吸収量との比較です。', impactMethod: '算定基準を見る', impactClose: '閉じる', impactTitle: '数字の算定基準',
      impactIntro: '公開売上を会社指定の単価で太陽光設備容量に換算したシナリオです。検証済みの施工容量、累積発電量、実際の排出削減量や植樹実績を示すものではありません。',
      impactRevenue: '公開売上の合計', impactCoverage: '対象年度：2019・2020・2021・2024・2025年。他の年度は数値未確認のため除外し、設立以来の総売上ではありません。2019年は同じ企業の財務ページの過去の公開検索情報を使用しました。',
      impactFormula: '確認できた売上合計5,558,290,000ウォンを会社指定単価の1MW当たり1億8,000万ウォン（1W当たり180ウォン）で割ると約30.9MW相当です。対象売上の全額を太陽光容量に換算すると仮定しました。年間発電量は1kW当たり1,200kWhを仮定。この単価は発電所全体の設置見積価格を意味するものではありません。',
      impactCarbonBasis: '換算年間発電量 × 0.4173tCO₂e/MWh。韓国の気候エネルギー環境部が2025年12月に公表した2023年消費端電力排出係数を使用。製造・施工などのライフサイクル排出、稼働開始時期、実際の運転状況を含まない電力代替ポテンシャルです。',
      impactTreeBasis: '年間削減ポテンシャル × 1,000 ÷ 6.6kg。樹齢30年のマツ1本の年間CO₂吸収量と比較しています。映像の森はこの効果を象徴し、実際の植樹本数ではありません。',
      impactSources: '出典', impactRevenueSource: '企業財務情報 · Saramin / NICE', impactGridSource: '国の電力排出係数 · 韓国気候エネルギー環境部', impactPineSource: 'マツの年間吸収量 · 韓国気候変動評価報告書2014、表4.4', impactAsOf: '確認日：2026年9月13日', impactGeneration: '仮定した年間発電量',
    },
  };
  for (const [lang, text] of Object.entries(labels)) Object.assign(dictionary[lang], text);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let finished = false;
  const formatter = (value, compact = false, decimals = 0) => new Intl.NumberFormat(document.documentElement.lang || 'ko', { notation: compact ? 'compact' : 'standard', maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);
  const smooth = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  function numbers() {
    const still = reduced.matches || navigator.connection?.saveData || ['fallback', 'autoplay-blocked', 'still'].includes(document.getElementById('hero').dataset.visionState);
    const t = film.currentTime;
    // The counters accumulate once, then retain the completed scenario while the
    // decorative construction film repeats. They are not a live production feed.
    if (t >= 35.5 || still) finished = true;
    const solar = finished ? 1 : smooth(13.6, 19, t);
    const forest = finished ? 1 : smooth(26, 35.5, t);
    host.querySelector('[data-impact="capacity"]').textContent = formatter(data.capacityKw / 1000 * solar, false, 1);
    host.querySelector('[data-impact="carbon"]').textContent = formatter(data.annualTco2e * forest);
    host.querySelector('[data-impact="trees"]').textContent = formatter(data.equivalentPines * forest, true, 1);
    host.querySelector('.impact-values').setAttribute('aria-label', `${dictionary[document.documentElement.lang]?.impactEstimate || labels.ko.impactEstimate}: ${formatter(data.capacityKw / 1000, false, 1)} MW, ${formatter(data.annualTco2e)} tCO₂e, ${formatter(data.equivalentPines)}.`);
  }
  function details() {
    dialog.querySelector('[data-impact-total]').textContent = `${formatter(data.revenueKrw)} KRW`;
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
