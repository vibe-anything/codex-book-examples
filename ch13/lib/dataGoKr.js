const SERVICE_KEY_ENV_NAME = "DATA_GO_KR_SERVICE_KEY";
const DATA_GO_KR_BASE_URL = "https://apis.data.go.kr";
const REQUEST_TIMEOUT_MS = 10_000;

export const STOCK_PRICE_PATH =
  "/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";
export const MARKET_INDEX_PATH =
  "/1160100/service/GetMarketIndexInfoService/getStockMarketIndex";

export function getDataGoKrServiceKey() {
  const serviceKey = process.env[SERVICE_KEY_ENV_NAME]?.trim();

  if (!serviceKey) {
    throw new Error(
      `${SERVICE_KEY_ENV_NAME}가 설정되지 않았습니다. .env 파일에 공공데이터포털 인증키를 입력해 주세요.`,
    );
  }

  return serviceKey;
}

function normalizeItems(items) {
  const item = items?.item;
  if (Array.isArray(item)) return item;
  return item ? [item] : [];
}

export async function fetchDataGoKrItems(pathname, params = {}) {
  const url = new URL(pathname, DATA_GO_KR_BASE_URL);
  url.searchParams.set("serviceKey", getDataGoKrServiceKey());
  url.searchParams.set("resultType", "json");

  Object.entries(params).forEach(([name, value]) => {
    url.searchParams.set(name, String(value));
  });

  let response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 * 60 },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error("공공데이터포털 API에 연결하지 못했습니다.");
  }

  if (!response.ok) {
    throw new Error(`공공데이터포털 API가 HTTP ${response.status}로 응답했습니다.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("공공데이터포털 API가 JSON이 아닌 응답을 반환했습니다.");
  }

  const header = payload?.response?.header;
  if (header?.resultCode !== "00") {
    throw new Error(
      `공공데이터포털 API 오류: ${header?.resultMsg ?? "알 수 없는 오류"}`,
    );
  }

  return normalizeItems(payload?.response?.body?.items);
}
