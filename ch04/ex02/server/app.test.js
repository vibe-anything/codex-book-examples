import { describe, expect, it } from 'vitest';
import { getAptTradesResponse } from './app.js';

describe('GET /api/apt-trades', () => {
  it('returns 400 for invalid query', async () => {
    const response = await getAptTradesResponse(
      { lawdCd: '11', dealYm: '202606' },
      { env: { MOLIT_SERVICE_KEY: 'key' } }
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it('returns 500 when service key is missing', async () => {
    const response = await getAptTradesResponse({ lawdCd: '11110', dealYm: '202606' }, { env: {} });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain('MOLIT_SERVICE_KEY');
  });

  it('returns normalized items', async () => {
    const xml = '<response><header><resultCode>00</resultCode></header><body><items><item><aptNm>A</aptNm><dealAmount>1,000</dealAmount></item></items></body></response>';
    const response = await getAptTradesResponse(
      { lawdCd: '11110', dealYm: '202606' },
      {
        env: { MOLIT_SERVICE_KEY: 'key', MOLIT_APT_TRADE_API_URL: 'https://example.test/api' },
        fetchImpl: async () => ({
          ok: true,
          text: async () => xml
        })
      }
    );

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.items[0]).toMatchObject({ apartmentName: 'A', price: '1,000' });
  });
});
