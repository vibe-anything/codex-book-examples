"use client";

import { useEffect, useMemo, useState } from "react";
import { changeTone, formatPrice, formatSigned } from "@/lib/market";

const STORAGE_KEY = "korea-market-dashboard-watchlist";
const MAX_SEARCH_RESULTS = 8;

function readSavedCodes() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.filter((code) => typeof code === "string"))];
  } catch {
    return [];
  }
}

export function Watchlist({ stocks }) {
  const [query, setQuery] = useState("");
  const [savedCodes, setSavedCodes] = useState([]);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const stockByCode = useMemo(
    () => new Map(stocks.map((stock) => [stock.code, stock])),
    [stocks]
  );
  const savedCodeSet = useMemo(() => new Set(savedCodes), [savedCodes]);
  const selectedStocks = useMemo(
    () => savedCodes.map((code) => stockByCode.get(code)).filter(Boolean),
    [savedCodes, stockByCode]
  );
  const searchResults = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ko-KR");
    if (!keyword) return [];

    return stocks
      .filter((stock) => (
        stock.name.toLocaleLowerCase("ko-KR").includes(keyword)
        || stock.code.toLocaleLowerCase("ko-KR").includes(keyword)
      ))
      .slice(0, MAX_SEARCH_RESULTS);
  }, [query, stocks]);

  useEffect(() => {
    setSavedCodes(readSavedCodes());
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCodes));
    } catch {
      // 저장 공간을 사용할 수 없어도 현재 화면의 선택 상태는 유지한다.
    }
  }, [isStorageReady, savedCodes]);

  function toggleStock(code) {
    setSavedCodes((currentCodes) => (
      currentCodes.includes(code)
        ? currentCodes.filter((savedCode) => savedCode !== code)
        : [...currentCodes, code]
    ));

    if (!savedCodeSet.has(code)) setQuery("");
  }

  function removeStock(code) {
    setSavedCodes((currentCodes) => currentCodes.filter((savedCode) => savedCode !== code));
  }

  return (
    <section className="watchlist" aria-labelledby="watchlist-title">
      <div className="watchlist-header">
        <div className="watchlist-heading">
          <h2 id="watchlist-title">관심 종목</h2>
          <span>{selectedStocks.length}개</span>
        </div>

        <div className="stock-search">
          <label htmlFor="watchlist-search">종목 검색</label>
          <div className="stock-search-field">
            <span aria-hidden="true">⌕</span>
            <input
              id="watchlist-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
              placeholder="종목명 또는 종목 코드"
              autoComplete="off"
            />
          </div>

          {query.trim() && (
            <div className="stock-search-results" aria-live="polite">
              {searchResults.length > 0 ? searchResults.map((stock) => {
                const isSaved = savedCodeSet.has(stock.code);

                return (
                  <button
                    key={stock.code}
                    type="button"
                    className="stock-search-result"
                    onClick={() => toggleStock(stock.code)}
                    aria-label={`${stock.name} 관심 종목 ${isSaved ? "해제" : "추가"}`}
                  >
                    <span className="stock-search-copy">
                      <strong>{stock.name}</strong>
                      <small>{stock.market} · {stock.code}</small>
                    </span>
                    <span className={`stock-search-action ${isSaved ? "remove" : ""}`}>
                      {isSaved ? "해제" : "+ 추가"}
                    </span>
                  </button>
                );
              }) : (
                <p className="stock-search-empty">일치하는 종목이 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedStocks.length > 0 ? (
        <div className="watchlist-cards">
          {selectedStocks.map((stock) => {
            const tone = changeTone(stock.changePercent);

            return (
              <article className="watch-card panel" key={stock.code}>
                <button
                  type="button"
                  className="watch-card-remove"
                  onClick={() => removeStock(stock.code)}
                  aria-label={`${stock.name} 관심 종목 해제`}
                  title="관심 종목 해제"
                >
                  ×
                </button>
                <div className="watch-card-name">
                  <strong>{stock.name}</strong>
                  <span>{stock.market} · {stock.code}</span>
                </div>
                <div className="watch-card-quote">
                  <p>
                    <span>현재가</span>
                    <strong>{formatPrice(stock.price)}</strong>
                  </p>
                  <span className={`watch-card-rate ${tone}`}>
                    {formatSigned(stock.changePercent, 2)}%
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="watchlist-empty panel">
          위 검색창에서 종목명이나 종목 코드를 검색해 관심 종목으로 추가해 보세요.
        </p>
      )}
    </section>
  );
}
