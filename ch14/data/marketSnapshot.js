export const exampleMarketSnapshot = {
  asOf: "예시 데이터",
  isMock: true,
  dataNotice: "공공데이터 수집 실패 시 표시하는 예시 데이터입니다.",
  indices: [
    {
      code: "KOSPI",
      name: "KOSPI",
      value: 2846.72,
      change: 24.58,
      changePercent: 0.87,
    },
    {
      code: "KOSDAQ",
      name: "KOSDAQ",
      value: 792.64,
      change: -3.87,
      changePercent: -0.49,
    },
  ],
  marketBreadth: {
    totalStocks: 2734,
    stocksUpThreePercent: 421,
  },
  sectors: [
    { name: "반도체", changePercent: 2.84 },
    { name: "자동차", changePercent: 1.42 },
    { name: "은행", changePercent: 0.63 },
    { name: "증권", changePercent: 3.18 },
    { name: "건설", changePercent: -0.74 },
    { name: "철강", changePercent: -1.36 },
    { name: "운송", changePercent: 0.21 },
    { name: "방송통신", changePercent: -0.18 },
  ],
  rankings: {
    gainers: [
      { code: "E001", market: "KOSPI", name: "한빛테크", price: 18420, turnover: 18400000000, changePercent: 29.99 },
      { code: "E002", market: "KOSDAQ", name: "세림바이오", price: 7350, turnover: 7350000000, changePercent: 24.58 },
      { code: "E003", market: "KOSDAQ", name: "미래로보틱스", price: 42600, turnover: 42600000000, changePercent: 18.33 },
      { code: "E004", market: "KOSPI", name: "동해에너지", price: 12980, turnover: 12980000000, changePercent: 15.89 },
      { code: "E005", market: "KOSDAQ", name: "네오소재", price: 25150, turnover: 25150000000, changePercent: 13.67 },
    ],
    losers: [
      { code: "E006", market: "KOSDAQ", name: "코어게임즈", price: 9860, turnover: 9860000000, changePercent: -14.92 },
      { code: "E007", market: "KOSPI", name: "그린셀", price: 21300, turnover: 21300000000, changePercent: -11.25 },
      { code: "E008", market: "KOSPI", name: "온누리제약", price: 16740, turnover: 16740000000, changePercent: -9.86 },
      { code: "E009", market: "KOSDAQ", name: "에이스모빌리티", price: 5820, turnover: 5820000000, changePercent: -8.35 },
      { code: "E010", market: "KOSDAQ", name: "스마트콘텐츠", price: 11450, turnover: 11450000000, changePercent: -7.92 },
    ],
    turnover: [
      { code: "005930", market: "KOSPI", name: "삼성전자", price: 73200, turnover: 1482000000000, changePercent: 1.81 },
      { code: "000660", market: "KOSPI", name: "SK하이닉스", price: 226500, turnover: 1264000000000, changePercent: 3.42 },
      { code: "005380", market: "KOSPI", name: "현대차", price: 247000, turnover: 684000000000, changePercent: 1.23 },
      { code: "042660", market: "KOSPI", name: "한화오션", price: 41950, turnover: 572000000000, changePercent: 4.09 },
      { code: "373220", market: "KOSPI", name: "LG에너지솔루션", price: 346500, turnover: 491000000000, changePercent: -2.39 },
    ],
  },
};

export const marketSnapshot = exampleMarketSnapshot;
