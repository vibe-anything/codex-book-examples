'use client';

import { useState } from 'react';

const STATUS_MESSAGES = {
  SUCCESS: '조회가 완료되었습니다.',
  EMPTY: '해당 조건의 거래 내역이 없습니다.',
  API_KEY_MISSING: 'API 키가 설정되지 않았습니다. 서버의 .env 파일에 PUBLIC_DATA_SERVICE_KEY를 설정하세요.',
  API_REQUEST_FAILED: 'API 호출에 실패했습니다. 잠시 후 다시 조회하세요.',
  INVALID_INPUT: '조회 조건을 다시 확인하세요.'
};

const DEFAULT_SUMMARY = {
  regionCode: '-',
  dealYmd: '-',
  count: '-'
};

const EMPTY_RESULT = {
  summary: DEFAULT_SUMMARY,
  items: []
};

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({
    message: '조회 조건을 입력하고 조회하세요.',
    isError: false
  });
  const [result, setResult] = useState(EMPTY_RESULT);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams(formData);

    try {
      const response = await fetch(`/api/transactions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || data.status === 'INVALID_INPUT') {
        setStatus({
          message: data.errors?.join(' ') || STATUS_MESSAGES.INVALID_INPUT,
          isError: true
        });
        setResult(EMPTY_RESULT);
        return;
      }

      setResult({
        summary: data.summary || DEFAULT_SUMMARY,
        items: data.items || []
      });
      setStatus({
        message: STATUS_MESSAGES[data.status] || STATUS_MESSAGES.API_REQUEST_FAILED,
        isError: isErrorStatus(data.status)
      });
    } catch {
      setStatus({
        message: STATUS_MESSAGES.API_REQUEST_FAILED,
        isError: true
      });
      setResult(EMPTY_RESULT);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="query-panel" aria-labelledby="page-title">
        <div>
          <h1 id="page-title">실거래가 조회</h1>
          <p>서울 강남구 아파트 매매 실거래가</p>
        </div>

        <form className="search-form" onSubmit={handleSubmit}>
          <label>
            지역 코드
            <input name="regionCode" inputMode="numeric" pattern="[0-9]{5}" defaultValue="11680" required />
          </label>
          <label>
            계약년월
            <input name="dealYmd" inputMode="numeric" pattern="[0-9]{6}" placeholder="202401" required />
          </label>
          <label>
            페이지
            <input name="pageNo" type="number" min="1" defaultValue="1" required />
          </label>
          <label>
            행 수
            <input name="numOfRows" type="number" min="1" defaultValue="10" required />
          </label>
          <button type="submit" disabled={isLoading}>
            {isLoading ? '조회 중' : '조회'}
          </button>
        </form>
      </section>

      <section className="summary" aria-live="polite">
        <div>
          <span>조회 지역</span>
          <strong>{result.summary?.regionCode || '-'}</strong>
        </div>
        <div>
          <span>계약월</span>
          <strong>{result.summary?.dealYmd || '-'}</strong>
        </div>
        <div>
          <span>거래 건수</span>
          <strong>{Number.isInteger(result.summary?.count) ? result.summary.count : '-'}</strong>
        </div>
      </section>

      <p className={`status-message${status.isError ? ' error' : ''}`} role="status">
        {status.message}
      </p>

      <section className="table-wrap" aria-labelledby="table-title">
        <h2 id="table-title">거래 목록</h2>
        <table>
          <thead>
            <tr>
              <th>단지명</th>
              <th>법정동</th>
              <th>거래금액</th>
              <th>전용면적</th>
              <th>층</th>
              <th>계약일</th>
              <th>건축년도</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item, index) => (
              <tr key={`${item.apartmentName}-${item.dealDate}-${index}`}>
                <td>{item.apartmentName || '-'}</td>
                <td>{item.legalDong || '-'}</td>
                <td>{item.dealAmount || '-'}</td>
                <td>{item.exclusiveArea || '-'}</td>
                <td>{item.floor || '-'}</td>
                <td>{item.dealDate || '-'}</td>
                <td>{item.buildYear || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function isErrorStatus(status) {
  return status === 'API_KEY_MISSING' || status === 'API_REQUEST_FAILED';
}
