'use client';

import { useState } from 'react';
import RegionAutocomplete from './components/region-autocomplete.jsx';

const STATUS_MESSAGES = {
  EMPTY: '해당 조건의 거래 내역이 없습니다.',
  API_KEY_MISSING: 'API 키가 설정되지 않았습니다. 서버의 .env 파일에 PUBLIC_DATA_SERVICE_KEY를 설정하세요.',
  API_AUTH_ERROR: 'API 인증에 실패했습니다. PUBLIC_DATA_SERVICE_KEY 값과 활용 신청 상태를 확인하세요.',
  API_REQUEST_FAILED: 'API 호출에 실패했습니다. 잠시 후 다시 조회하세요.',
  INVALID_INPUT: '조회 조건을 다시 확인하세요.'
};

const DEFAULT_SUMMARY = {
  regionCode: '-',
  regionName: '-',
  dealYmd: '-',
  count: '-',
  pageNo: 1,
  numOfRows: 10,
  totalPages: 1
};

const EMPTY_RESULT = {
  summary: DEFAULT_SUMMARY,
  items: []
};

const AREA_FILTERS = {
  all: { label: '전체', min: 0, max: Infinity },
  under60: { label: '60㎡ 이하', min: 0, max: 60 },
  from60To85: { label: '60~85㎡', min: 60, max: 85 },
  over85: { label: '85㎡ 초과', min: 85, max: Infinity }
};

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({
    code: null,
    message: '조회 조건을 입력하고 조회하세요.',
    isError: false
  });
  const [result, setResult] = useState(EMPTY_RESULT);
  const [selectedItem, setSelectedItem] = useState(null);
  const [lastQuery, setLastQuery] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const dealYmdMonth = formData.get('dealYmdMonth')?.trim() || '';
    const query = {
      regionName: formData.get('regionName')?.trim() || '',
      dealYmd: dealYmdMonth.replace('-', ''),
      exclusiveAreaRange: formData.get('exclusiveAreaRange') || 'all'
    };

    await loadPage(query, 1);
  }

  async function loadPage(query, pageNo) {
    setIsLoading(true);
    setSelectedItem(null);

    const params = new URLSearchParams({
      regionName: query.regionName,
      dealYmd: query.dealYmd,
      pageNo: String(pageNo)
    });

    try {
      const response = await fetch(`/api/transactions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || data.status === 'INVALID_INPUT') {
        setStatus({
          code: data.status || 'INVALID_INPUT',
          message: data.errors?.join(' ') || STATUS_MESSAGES.INVALID_INPUT,
          isError: true
        });
        setResult(EMPTY_RESULT);
        setSelectedItem(null);
        return;
      }

      setResult({
        summary: data.summary || DEFAULT_SUMMARY,
        items: data.items || []
      });
      setStatus({
        code: data.status,
        message: STATUS_MESSAGES[data.status] || STATUS_MESSAGES.API_REQUEST_FAILED,
        isError: isErrorStatus(data.status)
      });
      setLastQuery(query);
    } catch {
      setStatus({
        code: 'API_REQUEST_FAILED',
        message: STATUS_MESSAGES.API_REQUEST_FAILED,
        isError: true
      });
      setResult(EMPTY_RESULT);
      setSelectedItem(null);
    } finally {
      setIsLoading(false);
    }
  }

  const pageNo = result.summary?.pageNo || 1;
  const totalPages = result.summary?.totalPages || 1;
  const hasPageResult = Boolean(lastQuery) && !status.isError;
  const canMovePage = hasPageResult && !selectedItem;
  const displayedItems = filterItemsByExclusiveArea(result.items, lastQuery?.exclusiveAreaRange || 'all');
  const hasApiError = isErrorStatus(status.code);
  const shouldShowEmptyState = !selectedItem && hasPageResult && displayedItems.length === 0;

  return (
    <main className="app-shell">
      <section className="query-panel" aria-labelledby="page-title">
        <div>
          <h1 id="page-title">실거래가 조회</h1>
          <p>서울 강남구 아파트 매매 실거래가</p>
        </div>

        <form className="search-form" onSubmit={handleSubmit}>
          <RegionAutocomplete />
          <label>
            계약년월
            <input name="dealYmdMonth" type="month" defaultValue="2024-01" required />
          </label>
          <label>
            전용면적
            <select name="exclusiveAreaRange" defaultValue="all">
              {Object.entries(AREA_FILTERS).map(([value, filter]) => (
                <option key={value} value={value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={isLoading}>
            {isLoading ? '조회 중' : '조회'}
          </button>
        </form>
      </section>

      <section className="summary" aria-live="polite">
        <div>
          <span>조회 지역</span>
          <strong>{formatRegionSummary(result.summary)}</strong>
        </div>
        <div>
          <span>계약월</span>
          <strong>{formatDealMonth(result.summary?.dealYmd)}</strong>
        </div>
        <div>
          <span>거래 건수</span>
          <strong>{Number.isInteger(result.summary?.count) ? result.summary.count : '-'}</strong>
        </div>
        <div>
          <span>현재 페이지</span>
          <strong>{hasPageResult ? `${pageNo} / ${totalPages}` : '-'}</strong>
        </div>
      </section>

      {status.code !== 'SUCCESS' && (
        <p className={`status-message${status.isError ? ' error' : ''}`} role="status">
          {status.message}
        </p>
      )}

      {hasApiError ? (
        <section className="state-panel error-state" aria-labelledby="api-error-title">
          <h2 id="api-error-title">API 오류가 발생했습니다.</h2>
          <p>{status.message}</p>
        </section>
      ) : selectedItem ? (
        <section className="detail-wrap" aria-labelledby="detail-title">
          <div className="detail-header">
            <div>
              <h2 id="detail-title">{selectedItem.apartmentName || '거래 상세'}</h2>
              <p>
                {selectedItem.legalDong || '-'} · {selectedItem.dealDate || '-'} ·{' '}
                {formatDealAmount(selectedItem.dealAmount)}
              </p>
            </div>
            <button type="button" className="secondary-button" onClick={() => setSelectedItem(null)}>
              목록으로
            </button>
          </div>

          <dl className="field-list">
            {(selectedItem.rawFields || []).map((field, index) => (
              <div key={`${field.key}-${index}`} className="field-row">
                <dt>
                  <span>{field.label || field.key}</span>
                </dt>
                <dd>{field.value || '-'}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <section className="table-wrap" aria-labelledby="table-title">
          <h2 id="table-title">거래 목록</h2>
          {shouldShowEmptyState ? (
            <div className="state-panel empty-state" role="status">
              <h3>표시할 거래 내역이 없습니다.</h3>
              <p>조회 조건이나 전용면적 필터를 바꿔 다시 확인하세요.</p>
            </div>
          ) : (
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
                {displayedItems.map((item, index) => (
                  <tr
                    key={`${item.apartmentName}-${item.dealDate}-${index}`}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => setSelectedItem(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedItem(item);
                      }
                    }}
                  >
                    <td>{item.apartmentName || '-'}</td>
                    <td>{item.legalDong || '-'}</td>
                    <td>{formatDealAmount(item.dealAmount)}</td>
                    <td>{item.exclusiveArea || '-'}</td>
                    <td>{item.floor || '-'}</td>
                    <td>{item.dealDate || '-'}</td>
                    <td>{item.buildYear || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <nav className="pagination" aria-label="거래 목록 페이지">
            <button
              type="button"
              className="secondary-button"
              disabled={!canMovePage || pageNo <= 1 || isLoading}
              onClick={() => loadPage(lastQuery, pageNo - 1)}
            >
              이전
            </button>
            <span>
              {canMovePage ? `${pageNo} / ${totalPages}` : '-'}
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={!canMovePage || pageNo >= totalPages || isLoading}
              onClick={() => loadPage(lastQuery, pageNo + 1)}
            >
              다음
            </button>
          </nav>
        </section>
      )}
    </main>
  );
}

function filterItemsByExclusiveArea(items, rangeKey) {
  const filter = AREA_FILTERS[rangeKey] || AREA_FILTERS.all;

  if (filter === AREA_FILTERS.all) {
    return items;
  }

  return items.filter((item) => {
    const area = Number(item.exclusiveArea);

    if (!Number.isFinite(area)) {
      return false;
    }

    return area > filter.min && area <= filter.max;
  });
}

function isErrorStatus(status) {
  return status === 'API_KEY_MISSING' || status === 'API_AUTH_ERROR' || status === 'API_REQUEST_FAILED';
}

function formatDealMonth(dealYmd) {
  if (!/^\d{6}$/.test(String(dealYmd))) {
    return '-';
  }

  const year = String(dealYmd).slice(0, 4);
  const month = Number(String(dealYmd).slice(4, 6));

  return `${year}년 ${month}월`;
}

function formatRegionSummary(summary) {
  const regionName = summary?.regionName && summary.regionName !== '-' ? summary.regionName : '';
  const regionCode = summary?.regionCode && summary.regionCode !== '-' ? summary.regionCode : '';

  if (!regionName && !regionCode) {
    return '-';
  }

  if (regionName && regionCode) {
    return `${regionName} (${regionCode})`;
  }

  return regionName || regionCode;
}

function formatDealAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    return '-';
  }

  const eok = Math.floor(amount / 10000);
  const man = amount % 10000;

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString('ko-KR')}만 원`;
  }

  if (eok > 0) {
    return `${eok}억 원`;
  }

  return `${man.toLocaleString('ko-KR')}만 원`;
}
