import { describe, expect, it } from 'vitest';
import { buildAptTradeUrl, normalizeAptTradeResponse, validateAptTradeQuery } from './molit.js';

describe('validateAptTradeQuery', () => {
  it('accepts valid lawdCd and dealYm', () => {
    expect(validateAptTradeQuery({ lawdCd: '11110', dealYm: '202606' })).toEqual({
      lawdCd: '11110',
      dealYm: '202606'
    });
  });

  it('rejects invalid values', () => {
    expect(validateAptTradeQuery({ lawdCd: '1111', dealYm: '202613' }).error).toBeTruthy();
    expect(validateAptTradeQuery({ lawdCd: '11110', dealYm: '202613' }).error).toBeTruthy();
  });
});

describe('buildAptTradeUrl', () => {
  it('builds public API query parameters', () => {
    const url = buildAptTradeUrl({
      baseUrl: 'https://example.test/trades',
      serviceKey: 'abc',
      lawdCd: '11110',
      dealYm: '202606'
    });

    expect(url.searchParams.get('LAWD_CD')).toBe('11110');
    expect(url.searchParams.get('DEAL_YMD')).toBe('202606');
    expect(url.searchParams.get('serviceKey')).toBe('abc');
  });
});

describe('normalizeAptTradeResponse', () => {
  it('normalizes XML item responses', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <response>
        <header><resultCode>00</resultCode><resultMsg>OK</resultMsg></header>
        <body>
          <items>
            <item>
              <aptNm>테스트아파트</aptNm>
              <umdNm>청운동</umdNm>
              <dealYear>2026</dealYear>
              <dealMonth>6</dealMonth>
              <dealDay>12</dealDay>
              <dealAmount> 123,000 </dealAmount>
              <excluUseAr>84.97</excluUseAr>
              <floor>10</floor>
              <buildYear>2018</buildYear>
            </item>
          </items>
        </body>
      </response>`;

    expect(normalizeAptTradeResponse(xml)).toMatchObject([
      {
        apartmentName: '테스트아파트',
        legalDong: '청운동',
        dealYear: '2026',
        dealMonth: '6',
        dealDay: '12',
        price: '123,000',
        area: '84.97',
        floor: '10',
        builtYear: '2018'
      }
    ]);
  });

  it('returns an empty array when there are no items', () => {
    const xml = '<response><header><resultCode>00</resultCode></header><body><items></items></body></response>';
    expect(normalizeAptTradeResponse(xml)).toEqual([]);
  });
});
