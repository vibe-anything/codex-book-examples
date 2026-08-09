const SERVICE_KEY_ENV_NAME = "DATA_GO_KR_SERVICE_KEY";
const DATA_GO_KR_BASE_URL = "https://apis.data.go.kr";
// 이 API는 요청 크기와 무관하게 응답을 시작하기까지 6~7초를 쓴다. 1행을 요청해도
// 4,000행을 요청해도 비슷하다. 국내에서 재면 7초, 해외 리전에서는 9초까지 늘어난다.
// 10초로 잡으면 정상 응답도 경계에서 끊기므로 넉넉히 둔다.
const REQUEST_TIMEOUT_MS = 25_000;

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

function isTimeout(error) {
  return error?.name === "TimeoutError" || error?.name === "AbortError";
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
  } catch (error) {
    if (isTimeout(error)) {
      throw new Error(
        `공공데이터포털 API가 ${REQUEST_TIMEOUT_MS / 1000}초 안에 응답하지 않았습니다.`,
      );
    }
    throw new Error("공공데이터포털 API에 연결하지 못했습니다.");
  }

  if (!response.ok) {
    throw new Error(`공공데이터포털 API가 HTTP ${response.status}로 응답했습니다.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    // 응답 헤더는 빨리 오고 본문이 느리게 오는 API라, 시간 초과는 fetch가 아니라
    // 본문을 읽는 이 지점에서 터진다. 둘을 구분하지 않으면 시간 초과를 형식 오류로
    // 잘못 읽게 된다.
    if (isTimeout(error)) {
      throw new Error(
        `공공데이터포털 API 응답을 ${REQUEST_TIMEOUT_MS / 1000}초 안에 다 받지 못했습니다.`,
      );
    }
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
