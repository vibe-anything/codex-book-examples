import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const SAMPLE_TRANSACTIONS = [
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
  if (!env.PUBLIC_DATA_API_KEY) {
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

  // Chapter 8 can replace this branch with the real public-data API request.
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

export async function handleApiTransactions(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const validation = validateQuery(url.searchParams);

  if (!validation.ok) {
    sendJson(res, 400, {
      status: 'INVALID_INPUT',
      errors: validation.errors,
      summary: null,
      items: []
    });
    return;
  }

  try {
    const result = await fetchTransactions(validation.value);
    sendJson(res, 200, result);
  } catch {
    sendJson(res, 200, {
      status: 'API_REQUEST_FAILED',
      summary: {
        regionCode: validation.value.regionCode,
        dealYmd: validation.value.dealYmd,
        count: 0
      },
      items: []
    });
  }
}

export async function handleStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const requestedPath = normalize(join(publicDir, pathname));

  if (!requestedPath.startsWith(publicDir)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(requestedPath);
    res.writeHead(200, {
      'content-type': MIME_TYPES[extname(requestedPath)] || 'application/octet-stream'
    });
    res.end(content);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
}

export function createAppServer() {
  return createServer(async (req, res) => {
    if (req.url?.startsWith('/api/transactions')) {
      await handleApiTransactions(req, res);
      return;
    }

    await handleStatic(req, res);
  });
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createAppServer().listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
