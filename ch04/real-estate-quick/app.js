const regions = {
  11680: "서울 강남구",
  11710: "서울 송파구",
  41135: "경기 성남시 분당구",
  26440: "부산 강서구",
};

const sampleDeals = [
  { region: "11680", apt: "래미안대치팰리스", area: 84.97, floor: 18, day: 3, price: 324000, x: 63, y: 48 },
  { region: "11680", apt: "도곡렉슬", area: 59.98, floor: 9, day: 7, price: 236000, x: 36, y: 58 },
  { region: "11680", apt: "은마아파트", area: 76.79, floor: 5, day: 12, price: 267000, x: 57, y: 38 },
  { region: "11680", apt: "개포자이프레지던스", area: 84.83, floor: 21, day: 18, price: 301500, x: 46, y: 70 },
  { region: "11710", apt: "헬리오시티", area: 84.95, floor: 16, day: 6, price: 231000, x: 43, y: 54 },
  { region: "11710", apt: "잠실엘스", area: 84.8, floor: 22, day: 11, price: 285000, x: 55, y: 36 },
  { region: "11710", apt: "파크리오", area: 59.86, floor: 13, day: 21, price: 191000, x: 69, y: 42 },
  { region: "41135", apt: "파크뷰", area: 84.99, floor: 17, day: 4, price: 199000, x: 50, y: 45 },
  { region: "41135", apt: "봇들마을9단지", area: 101.93, floor: 12, day: 14, price: 225000, x: 61, y: 31 },
  { region: "41135", apt: "정자동 아이파크", area: 146.45, floor: 27, day: 26, price: 328000, x: 42, y: 62 },
  { region: "26440", apt: "명지더샵퍼스트월드", area: 84.92, floor: 19, day: 9, price: 71000, x: 48, y: 47 },
  { region: "26440", apt: "명지국제신도시 호반베르디움", area: 74.98, floor: 8, day: 19, price: 52000, x: 60, y: 58 },
];

const form = document.querySelector("#searchForm");
const regionSelect = document.querySelector("#regionSelect");
const dealMonth = document.querySelector("#dealMonth");
const keywordInput = document.querySelector("#keywordInput");
const minArea = document.querySelector("#minArea");
const maxArea = document.querySelector("#maxArea");
const serviceKey = document.querySelector("#serviceKey");
const sortSelect = document.querySelector("#sortSelect");
const resultTitle = document.querySelector("#resultTitle");
const sourcePill = document.querySelector("#sourcePill");
const countMetric = document.querySelector("#countMetric");
const avgMetric = document.querySelector("#avgMetric");
const maxMetric = document.querySelector("#maxMetric");
const unitMetric = document.querySelector("#unitMetric");
const resultBody = document.querySelector("#resultBody");
const emptyState = document.querySelector("#emptyState");
const mapCanvas = document.querySelector("#mapCanvas");
const resetButton = document.querySelector("#resetButton");

let currentDeals = [];
let sourceLabel = "샘플 데이터";

function formatMonth(value) {
  const [year, month] = value.split("-");
  return `${year}년 ${Number(month)}월`;
}

function formatPrice(manwon) {
  if (!Number.isFinite(manwon)) return "-";
  const eok = Math.floor(manwon / 10000);
  const rest = manwon % 10000;
  if (eok && rest) return `${eok}억 ${rest.toLocaleString("ko-KR")}만`;
  if (eok) return `${eok}억`;
  return `${manwon.toLocaleString("ko-KR")}만`;
}

function normalizePrice(value) {
  if (typeof value === "number") return value;
  return Number(String(value).replace(/[^\d]/g, ""));
}

function getFilters() {
  return {
    region: regionSelect.value,
    month: dealMonth.value,
    keyword: keywordInput.value.trim().toLowerCase(),
    minArea: Number(minArea.value) || 0,
    maxArea: Number(maxArea.value) || Infinity,
    serviceKey: serviceKey.value.trim(),
  };
}

async function fetchPublicDeals(filters) {
  const dealYm = filters.month.replace("-", "");
  const endpoint = new URL("https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev");
  endpoint.search = new URLSearchParams({
    serviceKey: filters.serviceKey,
    LAWD_CD: filters.region,
    DEAL_YMD: dealYm,
    pageNo: "1",
    numOfRows: "100",
  });

  const response = await fetch(endpoint);
  if (!response.ok) throw new Error("공공데이터 API 응답을 받지 못했습니다.");
  const xmlText = await response.text();
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  const items = [...xml.querySelectorAll("item")];

  return items.map((item, index) => {
    const text = (selector) => item.querySelector(selector)?.textContent?.trim() || "";
    return {
      region: filters.region,
      apt: text("aptNm") || text("아파트") || "단지명 없음",
      area: Number(text("excluUseAr") || text("전용면적")),
      floor: Number(text("floor") || text("층")),
      day: Number(text("dealDay") || text("일")),
      price: normalizePrice(text("dealAmount") || text("거래금액")),
      x: 24 + ((index * 17) % 58),
      y: 22 + ((index * 23) % 60),
    };
  });
}

function filterDeals(deals, filters) {
  return deals.filter((deal) => {
    const matchesRegion = deal.region === filters.region;
    const matchesKeyword = !filters.keyword || deal.apt.toLowerCase().includes(filters.keyword);
    const matchesArea = deal.area >= filters.minArea && deal.area <= filters.maxArea;
    return matchesRegion && matchesKeyword && matchesArea;
  });
}

function sortDeals(deals) {
  const sorted = [...deals];
  const sort = sortSelect.value;
  if (sort === "priceDesc") sorted.sort((a, b) => b.price - a.price);
  if (sort === "priceAsc") sorted.sort((a, b) => a.price - b.price);
  if (sort === "areaDesc") sorted.sort((a, b) => b.area - a.area);
  if (sort === "latest") sorted.sort((a, b) => b.day - a.day);
  return sorted;
}

function renderMetrics(deals) {
  const count = deals.length;
  const sum = deals.reduce((total, deal) => total + deal.price, 0);
  const areaPriceSum = deals.reduce((total, deal) => total + deal.price / deal.area, 0);
  const max = Math.max(...deals.map((deal) => deal.price), 0);

  countMetric.textContent = `${count.toLocaleString("ko-KR")}건`;
  avgMetric.textContent = count ? formatPrice(Math.round(sum / count)) : "-";
  maxMetric.textContent = count ? formatPrice(max) : "-";
  unitMetric.textContent = count ? `${Math.round(areaPriceSum / count).toLocaleString("ko-KR")}만/㎡` : "-";
}

function renderTable(deals) {
  resultBody.innerHTML = "";
  emptyState.hidden = deals.length > 0;

  for (const deal of deals) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="apt-name">${deal.apt}</span></td>
      <td>${deal.area.toFixed(2)}㎡</td>
      <td>${deal.floor}층</td>
      <td>${deal.day}일</td>
      <td class="price-cell">${formatPrice(deal.price)}</td>
    `;
    resultBody.append(row);
  }
}

function renderMap(deals) {
  mapCanvas.innerHTML = "";
  const prices = deals.map((deal) => deal.price);
  const minPrice = Math.min(...prices, 0);
  const maxPrice = Math.max(...prices, 1);

  for (const deal of deals) {
    const ratio = (deal.price - minPrice) / Math.max(maxPrice - minPrice, 1);
    const pin = document.createElement("button");
    pin.className = "map-pin";
    pin.type = "button";
    pin.style.left = `${deal.x}%`;
    pin.style.top = `${deal.y}%`;
    pin.style.setProperty("--size", `${34 + ratio * 22}px`);
    pin.style.setProperty("--pin-color", ratio > 0.66 ? "#b65f2a" : ratio > 0.33 ? "#2662a8" : "#0f766e");
    pin.title = `${deal.apt} ${formatPrice(deal.price)}`;
    pin.textContent = `${Math.round(deal.price / 10000)}`;
    mapCanvas.append(pin);
  }
}

function render() {
  const filters = getFilters();
  const deals = sortDeals(filterDeals(currentDeals, filters));
  resultTitle.textContent = `${regions[filters.region]} · ${formatMonth(filters.month)}`;
  sourcePill.textContent = sourceLabel;
  renderMetrics(deals);
  renderTable(deals);
  renderMap(deals);
}

async function handleSubmit(event) {
  event.preventDefault();
  const filters = getFilters();
  sourceLabel = "샘플 데이터";

  if (filters.serviceKey) {
    try {
      currentDeals = await fetchPublicDeals(filters);
      sourceLabel = "공공데이터 API";
    } catch (error) {
      sourceLabel = "API 실패 · 샘플 데이터";
      currentDeals = sampleDeals;
    }
  } else {
    currentDeals = sampleDeals;
  }

  render();
}

function resetFilters() {
  keywordInput.value = "";
  minArea.value = "";
  maxArea.value = "";
  sortSelect.value = "latest";
  render();
}

form.addEventListener("submit", handleSubmit);
sortSelect.addEventListener("change", render);
resetButton.addEventListener("click", resetFilters);

currentDeals = sampleDeals;
render();
