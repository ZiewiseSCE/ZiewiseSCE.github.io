/* Environmental comparison scenario; not an installation or planting record. */
(() => {
  const capacityKw = 30879.38888888889;
  const assumptions = {
    annualKwhPerKw: 1200,
    gridTco2ePerMwh: 0.4173,
    pineKgPerYear: 6.6,
  };
  const annualMwh = capacityKw * assumptions.annualKwhPerKw / 1000;
  const annualTco2e = annualMwh * assumptions.gridTco2ePerMwh;
  window.SCE_IMPACT = Object.freeze({
    checkedAt: '2026-09-13', assumptions, capacityKw, annualMwh, annualTco2e,
    equivalentPines: annualTco2e * 1000 / assumptions.pineKgPerYear,
    sources: {
      grid: 'https://eiec.kdi.re.kr/policy/materialView.do?num=274951&pg=&pp=&topic=P',
      pine: 'https://www.climate.go.kr/home/cc_data/2015/climate_change_report%28korean%292014_%28effect_adaptation%29.pdf',
    },
  });
})();
