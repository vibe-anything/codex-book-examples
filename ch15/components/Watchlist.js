"use client";

import { useEffect, useMemo, useState } from "react";
import { changeTone, formatPrice, formatSigned } from "@/lib/market";

const WATCHLIST_STORAGE_KEY = "market-dashboard-watchlist";
const SEARCH_RESULT_LIMIT = 8;

function readStoredCodes(stockByCode) {
  try {
    const storedValue = JSON.parse(
      window.localStorage.getItem(WATCHLIST_STORAGE_KEY) ?? "[]",
    );

    if (!Array.isArray(storedValue)) return [];

    return storedValue
      .map(String)
      .filter((code, index, codes) =>
        stockByCode.has(code) && codes.indexOf(code) === index,
      );
  } catch {
    return [];
  }
}

export function Watchlist({ stocks }) {
  const [query, setQuery] = useState("");
  const [favoriteCodes, setFavoriteCodes] = useState([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const stockByCode = useMemo(
    () => new Map(stocks.map((stock) => [stock.code, stock])),
    [stocks],
  );

  useEffect(() => {
    setFavoriteCodes(readStoredCodes(stockByCode));
    setIsStorageReady(true);
  }, [stockByCode]);

  useEffect(() => {
    if (!isStorageReady) return;
    try {
      window.localStorage.setItem(
        WATCHLIST_STORAGE_KEY,
        JSON.stringify(favoriteCodes),
      );
    } catch {
      // 저장소 사용이 제한된 환경에서도 화면 기능은 그대로 유지한다.
    }
  }, [favoriteCodes, isStorageReady]);

  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];

    return stocks
      .filter((stock) =>
        stock.name.toLocaleLowerCase("ko-KR").includes(normalizedQuery) ||
        stock.code.includes(normalizedQuery),
      )
      .slice(0, SEARCH_RESULT_LIMIT);
  }, [normalizedQuery, stocks]);
  const favoriteStocks = favoriteCodes
    .map((code) => stockByCode.get(code))
    .filter(Boolean);

  function toggleFavorite(code) {
    setFavoriteCodes((currentCodes) =>
      currentCodes.includes(code)
        ? currentCodes.filter((currentCode) => currentCode !== code)
        : [...currentCodes, code],
    );
  }

  return (
    <section className="watchlist" aria-labelledby="watchlist-title">
      <div className="section-heading watchlist-heading">
        <div>
          <h2 id="watchlist-title">관심 종목</h2>
          <p className="watchlist-caption">내가 고른 종목을 빠르게 확인하세요</p>
        </div>
        <div className="watchlist-search">
          <label className="screen-reader-only" htmlFor="watchlist-query">
            관심 종목 검색
          </label>
          <input
            id="watchlist-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="종목명 또는 종목코드 검색"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="watchlist-search-results"
            aria-expanded={Boolean(normalizedQuery)}
          />
          {normalizedQuery && (
            <div
              className="watchlist-search-results panel"
              id="watchlist-search-results"
            >
              {searchResults.length > 0 ? (
                <ul>
                  {searchResults.map((stock) => {
                    const isFavorite = favoriteCodes.includes(stock.code);

                    return (
                      <li key={stock.code}>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(stock.code)}
                          aria-pressed={isFavorite}
                        >
                          <span className="search-result-stock">
                            <strong>{stock.name}</strong>
                            <span>{stock.code}</span>
                          </span>
                          <span className={isFavorite ? "remove-label" : "add-label"}>
                            {isFavorite ? "해제" : "추가"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="watchlist-no-results">검색 결과가 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {favoriteStocks.length > 0 ? (
        <div className="watchlist-grid">
          {favoriteStocks.map((stock) => {
            const tone = changeTone(stock.changePercent);

            return (
              <article className="watchlist-card panel" key={stock.code}>
                <div className="watchlist-card-heading">
                  <div>
                    <h3>{stock.name}</h3>
                    <p>{stock.code}</p>
                  </div>
                  <button
                    type="button"
                    className="watchlist-remove"
                    onClick={() => toggleFavorite(stock.code)}
                    aria-label={`${stock.name} 관심 종목 해제`}
                  >
                    ×
                  </button>
                </div>
                <div className="watchlist-price-row">
                  <div>
                    <span>현재가</span>
                    <strong>{formatPrice(stock.price)}</strong>
                  </div>
                  <span className={`watchlist-rate ${tone}`}>
                    {formatSigned(stock.changePercent, 2)}%
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="watchlist-empty panel">
          <p>오른쪽 검색창에서 종목명이나 종목코드를 검색해 관심 종목을 추가해 보세요.</p>
        </div>
      )}
    </section>
  );
}
