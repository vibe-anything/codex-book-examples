const form = document.querySelector('#search-form');
const statusMessage = document.querySelector('#status-message');
const summaryRegion = document.querySelector('#summary-region');
const summaryMonth = document.querySelector('#summary-month');
const summaryCount = document.querySelector('#summary-count');
const tableBody = document.querySelector('#transactions-body');

const STATUS_MESSAGES = {
  SUCCESS: '조회가 완료되었습니다.',
  EMPTY: '해당 조건의 거래 내역이 없습니다.',
  API_KEY_MISSING: 'API 키가 설정되지 않았습니다. 서버의 .env 파일에 PUBLIC_DATA_SERVICE_KEY를 설정하세요.',
  API_REQUEST_FAILED: 'API 호출에 실패했습니다. 잠시 후 다시 조회하세요.',
  INVALID_INPUT: '조회 조건을 다시 확인하세요.'
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const params = new URLSearchParams(formData);

  setLoading(true, submitButton);

  try {
    const response = await fetch(`/api/transactions?${params.toString()}`);
    const result = await response.json();

    if (!response.ok || result.status === 'INVALID_INPUT') {
      renderStatus(result.errors?.join(' ') || STATUS_MESSAGES.INVALID_INPUT, true);
      renderSummary();
      renderRows([]);
      return;
    }

    renderSummary(result.summary);
    renderRows(result.items || []);
    renderStatus(STATUS_MESSAGES[result.status] || STATUS_MESSAGES.API_REQUEST_FAILED, isErrorStatus(result.status));
  } catch {
    renderStatus(STATUS_MESSAGES.API_REQUEST_FAILED, true);
    renderSummary();
    renderRows([]);
  } finally {
    setLoading(false, submitButton);
  }
});

function setLoading(isLoading, button) {
  button.disabled = isLoading;
  button.textContent = isLoading ? '조회 중' : '조회';
}

function renderStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
}

function renderSummary(summary) {
  summaryRegion.textContent = summary?.regionCode || '-';
  summaryMonth.textContent = summary?.dealYmd || '-';
  summaryCount.textContent = Number.isInteger(summary?.count) ? String(summary.count) : '-';
}

function renderRows(items) {
  tableBody.replaceChildren(
    ...items.map((item) => {
      const row = document.createElement('tr');
      [
        item.apartmentName,
        item.legalDong,
        item.dealAmount,
        item.exclusiveArea,
        item.floor,
        item.dealDate,
        item.buildYear
      ].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value || '-';
        row.append(cell);
      });
      return row;
    })
  );
}

function isErrorStatus(status) {
  return status === 'API_KEY_MISSING' || status === 'API_REQUEST_FAILED';
}
