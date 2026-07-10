import { NextResponse } from 'next/server';
import { fetchTransactions, validateQuery } from '../../../lib/transactions.js';

export async function GET(request) {
  const validation = validateQuery(request.nextUrl.searchParams);

  if (!validation.ok) {
    return NextResponse.json(
      {
        status: 'INVALID_INPUT',
        errors: validation.errors,
        summary: null,
        items: []
      },
      {
        status: 400,
        headers: {
          'cache-control': 'no-store'
        }
      }
    );
  }

  try {
    const result = await fetchTransactions(validation.value);

    return NextResponse.json(result, {
      headers: {
        'cache-control': 'no-store'
      }
    });
  } catch {
    return NextResponse.json(
      {
        status: 'API_REQUEST_FAILED',
        summary: {
          regionCode: validation.value.regionCode,
          dealYmd: validation.value.dealYmd,
          count: 0,
          pageNo: validation.value.pageNo,
          numOfRows: validation.value.numOfRows,
          totalPages: 1
        },
        items: []
      },
      {
        headers: {
          'cache-control': 'no-store'
        }
      }
    );
  }
}
