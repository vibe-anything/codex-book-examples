import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchTransactions, validateQuery } from './lib/transactions.js';

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

  it('returns mock rows through the server boundary when a key exists', async () => {
    const result = await fetchTransactions(query, { PUBLIC_DATA_SERVICE_KEY: 'server-only-key' });

    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.items.length, 2);
    assert.deepEqual(Object.keys(result.items[0]), [
      'apartmentName',
      'legalDong',
      'dealAmount',
      'exclusiveArea',
      'floor',
      'dealDate',
      'buildYear'
    ]);
  });

  it('can represent empty and failed upstream states separately', async () => {
    const empty = await fetchTransactions(query, { PUBLIC_DATA_SERVICE_KEY: 'key', MOCK_EMPTY: 'true' });
    const failed = await fetchTransactions(query, { PUBLIC_DATA_SERVICE_KEY: 'key', MOCK_API_FAILURE: 'true' });

    assert.equal(empty.status, 'EMPTY');
    assert.equal(failed.status, 'API_REQUEST_FAILED');
  });
});
