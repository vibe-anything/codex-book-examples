export const SAMPLE_TRANSACTIONS = [
  {
    apartmentName: '은마',
    legalDong: '대치동',
    dealAmount: '245,000',
    exclusiveArea: '76.79',
    floor: '8',
    dealDate: '2024-01-15',
    buildYear: '1979'
  },
  {
    apartmentName: '래미안대치팰리스',
    legalDong: '대치동',
    dealAmount: '398,000',
    exclusiveArea: '84.97',
    floor: '18',
    dealDate: '2024-01-22',
    buildYear: '2015'
  }
];

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

export async function fetchTransactions(query, env = process.env) {
  if (!env.PUBLIC_DATA_SERVICE_KEY) {
    return {
      status: 'API_KEY_MISSING',
      summary: {
        regionCode: query.regionCode,
        dealYmd: query.dealYmd,
        count: 0
      },
      items: []
    };
  }

  // 실제 공공데이터 API 호출은 이 자리에서 이어 붙인다.
  if (env.MOCK_API_FAILURE === 'true') {
    return {
      status: 'API_REQUEST_FAILED',
      summary: {
        regionCode: query.regionCode,
        dealYmd: query.dealYmd,
        count: 0
      },
      items: []
    };
  }

  const items = env.MOCK_EMPTY === 'true' ? [] : SAMPLE_TRANSACTIONS.slice(0, query.numOfRows);

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
