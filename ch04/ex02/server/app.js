import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAptTrades, validateAptTradeQuery } from './molit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export function createApp({ env = process.env, fetchImpl = fetch } = {}) {
  const app = express();

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/apt-trades', async (req, res) => {
    const result = await getAptTradesResponse(req.query, { env, fetchImpl });
    return res.status(result.status).json(result.body);
  });

  if (env.NODE_ENV === 'production') {
    const distDir = path.join(rootDir, 'dist');
    app.use(express.static(distDir));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

export async function getAptTradesResponse(query, { env = process.env, fetchImpl = fetch } = {}) {
  const validated = validateAptTradeQuery(query);
  if (validated.error) {
    return { status: 400, body: { error: validated.error } };
  }

  try {
    const items = await fetchAptTrades({
      fetchImpl,
      env,
      lawdCd: validated.lawdCd,
      dealYm: validated.dealYm
    });

    return { status: 200, body: { items, count: items.length } };
  } catch (error) {
    return {
      status: error.status || 502,
      body: {
        error: error.message || '실거래가 조회에 실패했습니다.',
        detail: error.detail
      }
    };
  }
}
