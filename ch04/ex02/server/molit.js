import { XMLParser } from 'fast-xml-parser';

export const DEFAULT_APT_TRADE_API_URL =
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true
});

export function validateAptTradeQuery(query) {
  const lawdCd = String(query.lawdCd || '').trim();
  const dealYm = String(query.dealYm || '').trim();

  if (!/^\d{5}$/.test(lawdCd)) {
    return { error: 'lawdCd는 법정동코드 앞 5자리여야 합니다.' };
  }

  if (!/^\d{6}$/.test(dealYm)) {
    return { error: 'dealYm은 YYYYMM 형식이어야 합니다.' };
  }

  const month = Number(dealYm.slice(4, 6));
  if (month < 1 || month > 12) {
    return { error: 'dealYm의 월은 01부터 12까지여야 합니다.' };
  }

  return { lawdCd, dealYm };
}

export function buildAptTradeUrl({ baseUrl, serviceKey, lawdCd, dealYm }) {
  const url = new URL(baseUrl || DEFAULT_APT_TRADE_API_URL);
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('LAWD_CD', lawdCd);
  url.searchParams.set('DEAL_YMD', dealYm);
  url.searchParams.set('numOfRows', '1000');
  url.searchParams.set('pageNo', '1');
  return url;
}

export function normalizeAptTradeResponse(body) {
  const parsed = parser.parse(body);
  const response = parsed?.response;
  const header = response?.header;

  const resultCode = String(header?.resultCode ?? '00').padStart(2, '0');
  if (resultCode !== '00') {
    throw new Error(header?.resultMsg || '공공 API 요청이 실패했습니다.');
  }

  const rawItems = response?.body?.items?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return items.map(normalizeTradeItem);
}

function normalizeTradeItem(item) {
  const get = (...keys) => {
    for (const key of keys) {
      if (item?.[key] !== undefined && item?.[key] !== null) {
        return String(item[key]).trim();
      }
    }
    return '';
  };

  return {
    apartmentName: get('aptNm', '아파트', '아파트명'),
    legalDong: get('umdNm', '법정동'),
    dealYear: get('dealYear', '년'),
    dealMonth: get('dealMonth', '월'),
    dealDay: get('dealDay', '일'),
    price: get('dealAmount', '거래금액').replace(/\s+/g, ''),
    area: get('excluUseAr', '전용면적'),
    floor: get('floor', '층'),
    builtYear: get('buildYear', '건축년도'),
    raw: item
  };
}

export async function fetchAptTrades({ fetchImpl = fetch, env, lawdCd, dealYm }) {
  const serviceKey = env.MOLIT_SERVICE_KEY;
  if (!serviceKey) {
    const error = new Error('MOLIT_SERVICE_KEY가 설정되지 않았습니다.');
    error.status = 500;
    throw error;
  }

  const url = buildAptTradeUrl({
    baseUrl: env.MOLIT_APT_TRADE_API_URL,
    serviceKey,
    lawdCd,
    dealYm
  });

  const response = await fetchImpl(url);
  const text = await response.text();

  if (!response.ok) {
    const error = new Error(`공공 API 응답 오류: ${response.status}`);
    error.status = 502;
    error.detail = text.slice(0, 500);
    throw error;
  }

  return normalizeAptTradeResponse(text);
}
