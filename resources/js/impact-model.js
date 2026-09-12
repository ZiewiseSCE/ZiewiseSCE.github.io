/* Public-revenue scenario, not a record of installed capacity or planted trees.
   All monetary inputs are KRW. Update the fiscal-year coverage with the values. */
(() => {
  const revenue = [
    { year: 2019, krw: 910090000 },
    { year: 2020, krw: 1788060000 },
    { year: 2021, krw: 1512650000 },
    { year: 2024, krw: 71300000 },
    { year: 2025, krw: 1276190000 },
  ];
  const assumptions = {
    // Owner-specified revenue conversion: KRW 180/W = KRW 180 million/MW.
    // This is a capacity-equivalent scenario, not a verified turnkey EPC price.
    krwPerKw: 180000,
    annualKwhPerKw: 1200,
    // 2023 consumption-side national factor, announced 18 December 2025.
    gridTco2ePerMwh: 0.4173,
    // Annual CO2 absorption comparison for a 30-year-old pine, kg/tree/year.
    pineKgPerYear: 6.6,
  };
  const revenueKrw = revenue.reduce((sum, row) => sum + row.krw, 0);
  const capacityKw = revenueKrw / assumptions.krwPerKw;
  const annualMwh = capacityKw * assumptions.annualKwhPerKw / 1000;
  const annualTco2e = annualMwh * assumptions.gridTco2ePerMwh;
  window.SCE_IMPACT = Object.freeze({
    checkedAt: '2026-09-13', revenue, assumptions, revenueKrw, capacityKw,
    annualMwh, annualTco2e, equivalentPines: annualTco2e * 1000 / assumptions.pineKgPerYear,
    coverage: '2019, 2020, 2021, 2024, 2025',
    omittedYears: [2017, 2018, 2022, 2023, 2026],
    sources: {
      revenue: 'https://www.saramin.co.kr/zf_user/company-info/view-inner-finance/csn/Q1dnb2V5d1pQc0o5UERkQ1FRNlZjZz09/company_nm/(%EC%A3%BC)%EC%97%90%EC%8A%A4%EC%94%A8%EC%97%90%EB%84%88%EC%A7%80',
      grid: 'https://eiec.kdi.re.kr/policy/materialView.do?num=274951&pg=&pp=&topic=P',
      pine: 'https://www.climate.go.kr/home/cc_data/2015/climate_change_report%28korean%292014_%28effect_adaptation%29.pdf',
    },
  });
})();
