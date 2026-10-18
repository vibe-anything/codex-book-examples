"use client";

import { useEffect, useState } from "react";
import { changeTone, formatPrice, formatSigned } from "@/lib/market";

const STORAGE_KEY = "market-dashboard:watchlist";

export function Watchlist({ stocks }) {
  const [codes, setCodes] = useState([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        setCodes([...new Set(saved.filter(code => typeof code === "string"))]);
      }
    } catch {
      setStorageError("저장된 관심 종목을 불러오지 못했습니다. 브라우저 저장 설정을 확인해 주세요.");
    }
    setReady(true);
  }, []);

  function toggle(code) {
    const next = codes.includes(code) ? codes.filter(item => item !== code) : [...codes, code];
    setCodes(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError("관심 종목을 저장하지 못했습니다. 새로 고침하면 변경 사항이 사라질 수 있습니다.");
    }
  }

  const stocksByCode = new Map(stocks.map(stock => [stock.code, stock]));
  const search = query.trim().toLocaleLowerCase();
  const matches = search ? [...stocksByCode.values()].filter(stock =>
    stock.name.toLocaleLowerCase().includes(search) || stock.code.toLocaleLowerCase().includes(search)
  ) : [];

  return (
    <section className="watchlist" aria-labelledby="watchlist-title">
      <div className="section-heading watchlist-heading">
        <h2 id="watchlist-title">관심 종목</h2>
        <span className="eyebrow">수집된 시세 기준</span>
      </div>
      <div className="watchlist-search panel">
        <label htmlFor="stock-search">관심 종목 추가</label>
        <input id="stock-search" type="search" placeholder="종목명 또는 종목 코드 검색"
          value={query} onChange={event => setQuery(event.target.value)} disabled={!ready}
          aria-describedby="stock-search-help" aria-controls="stock-search-results" />
        <p id="stock-search-help">종목을 검색한 뒤 추가 버튼을 눌러 주세요.</p>
        {search && (
          <div id="stock-search-results" className="watchlist-results">
            <p role="status">검색 결과 {matches.length}개</p>
            {matches.length === 0 && <p>일치하는 종목이 없습니다. 다른 종목명이나 코드를 입력해 주세요.</p>}
            <ul>
              {matches.map(stock => (
                <li key={stock.code}>
                  <span><strong>{stock.name}</strong>{!stock.code.startsWith("mock:") && <small>{stock.code}</small>}</span>
                  <span>{formatPrice(stock.price)}</span>
                  <span className={`rate-badge ${changeTone(stock.changePercent)}`}>{formatSigned(stock.changePercent, 2)}%</span>
                  <button type="button" onClick={() => toggle(stock.code)} aria-label={`${stock.name} 관심 종목 ${codes.includes(stock.code) ? "해제" : "추가"}`}>
                    {codes.includes(stock.code) ? "해제" : "추가"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {storageError && <p className="watchlist-notice" role="status">{storageError}</p>}
      {!ready ? <p className="watchlist-empty panel">관심 종목을 불러오는 중입니다.</p>
        : codes.length === 0 ? <p className="watchlist-empty panel">관심 종목이 없습니다. 위 검색창에서 종목을 검색해 추가해 보세요.</p>
          : <ul className="watchlist-cards">
            {codes.map(code => {
              const stock = stocksByCode.get(code);
              return (
                <li className="watchlist-card panel" key={code}>
                  <div className="watchlist-card-heading">
                    <h3>{stock?.name || code.replace(/^mock:/, "")}</h3>
                    <button type="button" onClick={() => toggle(code)} aria-label={`${stock?.name || code} 관심 종목 해제`}>해제</button>
                  </div>
                  {stock ? <>
                    <p className={`watchlist-price ${changeTone(stock.changePercent)}`}>{formatPrice(stock.price)}</p>
                    <span className={`rate-badge ${changeTone(stock.changePercent)}`}>{formatSigned(stock.changePercent, 2)}%</span>
                  </> : <p className="watchlist-notice">현재 수집된 시세가 없습니다.</p>}
                </li>
              );
            })}
          </ul>}
    </section>
  );
}
