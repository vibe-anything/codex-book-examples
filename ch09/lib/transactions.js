const API_ENDPOINT = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';
export const PAGE_SIZE = 10;

const AUTH_ERROR_CODES = new Set([
  '01',
  '04',
  '20',
  '21',
  '22',
  '30',
  '31',
  'SERVICE_KEY_IS_NOT_REGISTERED_ERROR'
]);

const TRANSACTION_FIELD_LABELS = {
  sggCd: '지역코드',
  umdNm: '법정동',
  aptNm: '단지명',
  jibun: '지번',
  excluUseAr: '전용면적',
  dealYear: '계약년도',
  dealMonth: '계약월',
  dealDay: '계약일',
  dealAmount: '거래금액(만원)',
  floor: '층',
  buildYear: '건축년도',
  cdealType: '해제여부',
  cdealDay: '해제사유발생일',
  dealingGbn: '거래유형(중개 및 직거래 여부)',
  estateAgentSggNm: '중개사소재지(시군구 단위)',
  rgstDate: '등기일자',
  aptDong: '아파트 동명',
  slerGbn: '거래주체정보_매도자(개인/법인/공공기관/기타)',
  buyerGbn: '거래주체정보_매수자(개인/법인/공공기관/기타)',
  landLeaseholdGbn: '토지임대부 아파트 여부'
};

export function validateQuery(params) {
  const regionCode = params.get('regionCode')?.trim() || '11680';
  const dealYmd = params.get('dealYmd')?.trim() || '';
  const pageNo = params.get('pageNo')?.trim() || '1';
  const numOfRows = params.get('numOfRows')?.trim();

  const errors = [];

  if (!/^\d{5}$/.test(regionCode)) {
    errors.push('지역 코드는 숫자 5자리여야 합니다.');
  }

  if (!/^\d{6}$/.test(dealYmd)) {
    errors.push('계약년월은 YYYYMM 형식이어야 합니다.');
  }

  if (!/^[1-9]\d*$/.test(pageNo)) {
    errors.push('페이지 번호는 1 이상의 숫자여야 합니다.');
  }

  if (numOfRows && numOfRows !== String(PAGE_SIZE)) {
    errors.push('행 수는 10으로 고정됩니다.');
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      regionCode,
      dealYmd,
      pageNo: Number(pageNo),
      numOfRows: PAGE_SIZE
    }
  };
}

export async function fetchTransactions(query, env = process.env, fetchImpl = fetch) {
  if (!env.PUBLIC_DATA_SERVICE_KEY) {
    return createEmptyResult('API_KEY_MISSING', query);
  }

  const response = await fetchImpl(buildRequestUrl(query, env.PUBLIC_DATA_SERVICE_KEY), {
    headers: {
      accept: 'application/xml'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    return createEmptyResult(response.status === 401 || response.status === 403 ? 'API_AUTH_ERROR' : 'API_REQUEST_FAILED', query);
  }

  const xml = await response.text();
  const apiError = parseApiError(xml);

  if (apiError) {
    return createEmptyResult(apiError.isAuthError ? 'API_AUTH_ERROR' : 'API_REQUEST_FAILED', query);
  }

  const items = parseTransactionItems(xml);
  const totalCount = parsePositiveInteger(getTagValue(xml, 'totalCount'), items.length);
  const pageNo = parsePositiveInteger(getTagValue(xml, 'pageNo'), query.pageNo);
  const numOfRows = parsePositiveInteger(getTagValue(xml, 'numOfRows'), query.numOfRows);

  return {
    status: items.length > 0 ? 'SUCCESS' : 'EMPTY',
    summary: {
      regionCode: query.regionCode,
      dealYmd: query.dealYmd,
      count: totalCount,
      pageNo,
      numOfRows,
      totalPages: Math.max(1, Math.ceil(totalCount / numOfRows))
    },
    items
  };
}

export function buildRequestUrl(query, serviceKey) {
  const url = new URL(API_ENDPOINT);

  url.searchParams.set('serviceKey', normalizeServiceKey(serviceKey));
  url.searchParams.set('LAWD_CD', query.regionCode);
  url.searchParams.set('DEAL_YMD', query.dealYmd);
  url.searchParams.set('pageNo', String(query.pageNo));
  url.searchParams.set('numOfRows', String(query.numOfRows));

  return url;
}

export function parseTransactionItems(xml) {
  return getBlocks(xml, 'item').map((itemXml) => ({
    apartmentName: getTagValue(itemXml, 'aptNm'),
    legalDong: getTagValue(itemXml, 'umdNm'),
    dealAmount: parseDealAmount(getTagValue(itemXml, 'dealAmount')),
    exclusiveArea: getTagValue(itemXml, 'excluUseAr'),
    floor: getTagValue(itemXml, 'floor'),
    dealDate: formatDealDate(
      getTagValue(itemXml, 'dealYear'),
      getTagValue(itemXml, 'dealMonth'),
      getTagValue(itemXml, 'dealDay')
    ),
    buildYear: getTagValue(itemXml, 'buildYear'),
    rawFields: getTagEntries(itemXml)
  }));
}

function parseApiError(xml) {
  const resultCode = getTagValue(xml, 'resultCode');
  const returnReasonCode = getTagValue(xml, 'returnReasonCode');
  const code = resultCode || returnReasonCode;

  if (!code || code === '000' || code === '00') {
    return null;
  }

  return {
    code,
    isAuthError: AUTH_ERROR_CODES.has(code)
  };
}

function createEmptyResult(status, query) {
  return {
    status,
    summary: {
      regionCode: query.regionCode,
      dealYmd: query.dealYmd,
      count: 0,
      pageNo: query.pageNo,
      numOfRows: query.numOfRows,
      totalPages: 1
    },
    items: []
  };
}

function parseDealAmount(value) {
  const amount = Number(String(value).replaceAll(',', '').trim());
  return Number.isFinite(amount) ? amount : 0;
}

function parsePositiveInteger(value, fallback) {
  const number = Number(String(value).trim());
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function normalizeServiceKey(serviceKey) {
  const trimmedKey = serviceKey.trim();

  try {
    return decodeURIComponent(trimmedKey);
  } catch {
    return trimmedKey;
  }
}

function formatDealDate(year, month, day) {
  if (!year || !month || !day) {
    return '';
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function getBlocks(xml, tagName) {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'g');
  return [...xml.matchAll(pattern)].map((match) => match[1]);
}

function getTagValue(xml, tagName) {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const value = xml.match(pattern)?.[1] || '';
  return decodeXml(value.trim());
}

function getTagEntries(xml) {
  const pattern = /<([A-Za-z0-9_:-]+)>([\s\S]*?)<\/\1>/g;
  return [...xml.matchAll(pattern)].map((match) => ({
    key: match[1],
    label: TRANSACTION_FIELD_LABELS[match[1]] || match[1],
    value: decodeXml(match[2].trim())
  }));
}

function decodeXml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}
