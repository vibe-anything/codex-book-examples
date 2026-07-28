const API_ENDPOINT = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';

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

export function validateQuery(params) {
  const regionCode = params.get('regionCode')?.trim() || '11680';
  const dealYmd = params.get('dealYmd')?.trim() || '';
  const pageNo = params.get('pageNo')?.trim() || '1';
  const numOfRows = params.get('numOfRows')?.trim() || '10';

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

  if (!/^[1-9]\d*$/.test(numOfRows)) {
    errors.push('행 수는 1 이상의 숫자여야 합니다.');
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      regionCode,
      dealYmd,
      pageNo: Number(pageNo),
      numOfRows: Number(numOfRows)
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

  return {
    status: items.length > 0 ? 'SUCCESS' : 'EMPTY',
    summary: {
      regionCode: query.regionCode,
      dealYmd: query.dealYmd,
      count: items.length
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
    buildYear: getTagValue(itemXml, 'buildYear')
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
      count: 0
    },
    items: []
  };
}

function parseDealAmount(value) {
  const amount = Number(String(value).replaceAll(',', '').trim());
  return Number.isFinite(amount) ? amount : 0;
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

function decodeXml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}
