import { NextResponse } from 'next/server';
import { findRegionSuggestions } from '../../../lib/region-codes.js';

export const dynamic = 'force-dynamic';

export function GET(request) {
  const query = request.nextUrl.searchParams.get('query')?.trim() || '';

  if (!query) {
    return NextResponse.json({ status: 'SUCCESS', items: [] }, { headers: { 'cache-control': 'no-store' } });
  }

  if (query.length > 40) {
    return NextResponse.json(
      { status: 'INVALID_INPUT', errors: ['지역명은 40자 이하로 입력하세요.'], items: [] },
      { status: 400, headers: { 'cache-control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { status: 'SUCCESS', items: findRegionSuggestions(query) },
    { headers: { 'cache-control': 'no-store' } }
  );
}
