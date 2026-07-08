import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequestUrl, fetchTransactions, parseTransactionItems, validateQuery } from './lib/transactions.js';

describe('validateQuery', () => {
  it('accepts the planned query shape', () => {
    const params = new URLSearchParams({
      regionCode: '11680',
      dealYmd: '202401',
      pageNo: '1',
      numOfRows: '10'
    });

    assert.deepEqual(validateQuery(params), {
      ok: true,
      errors: [],
      value: {
        regionCode: '11680',
        dealYmd: '202401',
        pageNo: 1,
        numOfRows: 10
      }
    });
  });

  it('rejects invalid input before API work', () => {
    const result = validateQuery(new URLSearchParams({ regionCode: 'abc', dealYmd: '2024' }));

    assert.equal(result.ok, false);
    assert.equal(result.errors.length, 2);
  });
});

describe('fetchTransactions', () => {
  const query = {
    regionCode: '11680',
    dealYmd: '202401',
    pageNo: 1,
    numOfRows: 10
  };

  it('returns a distinct status when the server API key is missing', async () => {
    const result = await fetchTransactions(query, {});

    assert.equal(result.status, 'API_KEY_MISSING');
    assert.deepEqual(result.items, []);
  });

  it('requests the public data API with the server-only key', async () => {
    let requestedUrl;
    const fetchImpl = async (url) => {
      requestedUrl = url;
      return createXmlResponse(successXml);
    };

    const result = await fetchTransactions(query, { PUBLIC_DATA_API_KEY: 'server-only-key' }, fetchImpl);

    assert.equal(result.status, 'SUCCESS');
    assert.equal(requestedUrl.searchParams.get('LAWD_CD'), '11680');
    assert.equal(requestedUrl.searchParams.get('DEAL_YMD'), '202401');
    assert.equal(requestedUrl.searchParams.get('serviceKey'), 'server-only-key');
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].dealAmount, 245000);
    assert.deepEqual(Object.keys(result.items[0]), [
      'apartmentName',
      'legalDong',
      'dealAmount',
      'exclusiveArea',
      'floor',
      'dealDate',
      'buildYear',
      'rawFields'
    ]);
    assert.deepEqual(result.items[0].rawFields, [
      { key: 'sggCd', label: '지역코드', value: '11680' },
      { key: 'umdNm', label: '법정동', value: '대치동' },
      { key: 'aptNm', label: '단지명', value: '은마' },
      { key: 'jibun', label: '지번', value: '316' },
      { key: 'excluUseAr', label: '전용면적', value: '76.79' },
      { key: 'dealYear', label: '계약년도', value: '2024' },
      { key: 'dealMonth', label: '계약월', value: '1' },
      { key: 'dealDay', label: '계약일', value: '15' },
      { key: 'dealAmount', label: '거래금액(만원)', value: '245,000' },
      { key: 'floor', label: '층', value: '8' },
      { key: 'buildYear', label: '건축년도', value: '1979' },
      { key: 'dealingGbn', label: '거래유형(중개 및 직거래 여부)', value: '중개거래' },
      { key: 'estateAgentSggNm', label: '중개사소재지(시군구 단위)', value: '서울 강남구' },
      { key: 'rgstDate', label: '등기일자', value: '2024-02-01' }
    ]);
  });

  it('can represent empty and failed upstream states separately', async () => {
    const empty = await fetchTransactions(query, { PUBLIC_DATA_API_KEY: 'key' }, async () => createXmlResponse(emptyXml));
    const failed = await fetchTransactions(query, { PUBLIC_DATA_API_KEY: 'key' }, async () => createXmlResponse(serviceErrorXml));

    assert.equal(empty.status, 'EMPTY');
    assert.equal(failed.status, 'API_REQUEST_FAILED');
  });

  it('classifies upstream authentication errors separately', async () => {
    const result = await fetchTransactions(query, { PUBLIC_DATA_API_KEY: 'bad-key' }, async () => createXmlResponse(authErrorXml));

    assert.equal(result.status, 'API_AUTH_ERROR');
    assert.deepEqual(result.items, []);
  });
});

describe('public data API helpers', () => {
  it('builds the documented apartment trade endpoint', () => {
    const url = buildRequestUrl(
      {
        regionCode: '11110',
        dealYmd: '201512',
        pageNo: 2,
        numOfRows: 20
      },
      'key'
    );

    assert.equal(
      url.origin + url.pathname,
      'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade'
    );
    assert.equal(url.searchParams.get('pageNo'), '2');
    assert.equal(url.searchParams.get('numOfRows'), '20');
  });

  it('parses public data XML into normalized transaction rows', () => {
    const [item] = parseTransactionItems(successXml);

    assert.deepEqual(item, {
      apartmentName: '은마',
      legalDong: '대치동',
      dealAmount: 245000,
      exclusiveArea: '76.79',
      floor: '8',
      dealDate: '2024-01-15',
      buildYear: '1979',
      rawFields: [
        { key: 'sggCd', label: '지역코드', value: '11680' },
        { key: 'umdNm', label: '법정동', value: '대치동' },
        { key: 'aptNm', label: '단지명', value: '은마' },
        { key: 'jibun', label: '지번', value: '316' },
        { key: 'excluUseAr', label: '전용면적', value: '76.79' },
        { key: 'dealYear', label: '계약년도', value: '2024' },
        { key: 'dealMonth', label: '계약월', value: '1' },
        { key: 'dealDay', label: '계약일', value: '15' },
        { key: 'dealAmount', label: '거래금액(만원)', value: '245,000' },
        { key: 'floor', label: '층', value: '8' },
        { key: 'buildYear', label: '건축년도', value: '1979' },
        { key: 'dealingGbn', label: '거래유형(중개 및 직거래 여부)', value: '중개거래' },
        { key: 'estateAgentSggNm', label: '중개사소재지(시군구 단위)', value: '서울 강남구' },
        { key: 'rgstDate', label: '등기일자', value: '2024-02-01' }
      ]
    });
  });
});

function createXmlResponse(xml, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    text: async () => xml
  };
}

const successXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header>
    <resultCode>000</resultCode>
    <resultMsg>OK</resultMsg>
  </header>
  <body>
    <items>
      <item>
        <sggCd>11680</sggCd>
        <umdNm>대치동</umdNm>
        <aptNm>은마</aptNm>
        <jibun>316</jibun>
        <excluUseAr>76.79</excluUseAr>
        <dealYear>2024</dealYear>
        <dealMonth>1</dealMonth>
        <dealDay>15</dealDay>
        <dealAmount>245,000</dealAmount>
        <floor>8</floor>
        <buildYear>1979</buildYear>
        <dealingGbn>중개거래</dealingGbn>
        <estateAgentSggNm>서울 강남구</estateAgentSggNm>
        <rgstDate>2024-02-01</rgstDate>
      </item>
    </items>
    <totalCount>1</totalCount>
    <numOfRows>10</numOfRows>
    <pageNo>1</pageNo>
  </body>
</response>`;

const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header>
    <resultCode>000</resultCode>
    <resultMsg>OK</resultMsg>
  </header>
  <body>
    <items />
    <totalCount>0</totalCount>
  </body>
</response>`;

const serviceErrorXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header>
    <resultCode>99</resultCode>
    <resultMsg>SERVICE ERROR</resultMsg>
  </header>
</response>`;

const authErrorXml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenAPI_ServiceResponse>
  <cmmMsgHeader>
    <returnReasonCode>30</returnReasonCode>
    <returnAuthMsg>SERVICE KEY IS NOT REGISTERED ERROR.</returnAuthMsg>
  </cmmMsgHeader>
</OpenAPI_ServiceResponse>`;
