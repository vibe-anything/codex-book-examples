import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { REGIONS } from './regions.js';
import './styles.css';

const now = new Date();
const defaultDealYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

function App() {
  const [sidoCode, setSidoCode] = useState(REGIONS[0].code);
  const [lawdCd, setLawdCd] = useState(REGIONS[0].districts[0].code);
  const [dealYm, setDealYm] = useState(defaultDealYm);
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const selectedSido = REGIONS.find((region) => region.code === sidoCode) || REGIONS[0];
  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return items;
    return items.filter((item) => item.apartmentName.toLowerCase().includes(normalizedKeyword));
  }, [items, keyword]);

  const handleSidoChange = (event) => {
    const nextSido = REGIONS.find((region) => region.code === event.target.value) || REGIONS[0];
    setSidoCode(nextSido.code);
    setLawdCd(nextSido.districts[0].code);
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const response = await fetch(`/api/apt-trades?lawdCd=${lawdCd}&dealYm=${dealYm}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || '조회에 실패했습니다.');
      }

      setItems(payload.items || []);
      setStatus('success');
    } catch (err) {
      setItems([]);
      setStatus('error');
      setError(err.message || '조회 중 오류가 발생했습니다.');
    }
  };

  return (
    <main className="app-shell">
      <section className="search-panel">
        <div className="title-group">
          <p>국토교통부 아파트 매매 실거래가</p>
          <h1>실거래가 조회</h1>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <label>
            <span>시도</span>
            <select value={sidoCode} onChange={handleSidoChange}>
              {REGIONS.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>시군구</span>
            <select value={lawdCd} onChange={(event) => setLawdCd(event.target.value)}>
              {selectedSido.districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>거래월</span>
            <input
              type="month"
              value={`${dealYm.slice(0, 4)}-${dealYm.slice(4, 6)}`}
              onChange={(event) => setDealYm(event.target.value.replace('-', ''))}
            />
          </label>

          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? '조회 중' : '조회'}
          </button>
        </form>
      </section>

      <section className="result-panel">
        <div className="result-toolbar">
          <div>
            <h2>거래 내역</h2>
            <p>{status === 'success' ? `${filteredItems.length.toLocaleString()}건 표시` : '지역과 월을 선택해 조회하세요'}</p>
          </div>
          <label className="keyword-filter">
            <span>단지명</span>
            <input
              type="search"
              placeholder="예: 래미안"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
        </div>

        {status === 'error' && <div className="state-message error">{error}</div>}
        {status === 'loading' && <div className="state-message">실거래가를 불러오는 중입니다.</div>}
        {status === 'success' && filteredItems.length === 0 && (
          <div className="state-message">조건에 맞는 거래 내역이 없습니다.</div>
        )}
        {status !== 'loading' && filteredItems.length > 0 && <TradeTable items={filteredItems} />}
      </section>
    </main>
  );
}

function TradeTable({ items }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>단지명</th>
            <th>법정동</th>
            <th>거래일</th>
            <th>거래금액</th>
            <th>전용면적</th>
            <th>층</th>
            <th>건축년도</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.apartmentName}-${item.dealYear}-${item.dealMonth}-${item.dealDay}-${index}`}>
              <td className="name-cell">{item.apartmentName || '-'}</td>
              <td>{item.legalDong || '-'}</td>
              <td>{formatDealDate(item)}</td>
              <td className="price-cell">{item.price ? `${item.price}만원` : '-'}</td>
              <td>{item.area ? `${item.area}㎡` : '-'}</td>
              <td>{item.floor || '-'}</td>
              <td>{item.builtYear || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDealDate(item) {
  if (!item.dealYear || !item.dealMonth || !item.dealDay) return '-';
  return `${item.dealYear}.${String(item.dealMonth).padStart(2, '0')}.${String(item.dealDay).padStart(2, '0')}`;
}

createRoot(document.getElementById('root')).render(<App />);
