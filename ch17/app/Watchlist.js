"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const STORAGE_KEY = "korea-market-dashboard-watchlist";
const MAX_SEARCH_RESULTS = 8;

function formatRate(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function movementClass(value) {
  if (value > 0) return styles.positive;
  if (value < 0) return styles.negative;
  return styles.neutral;
}

function readStoredCodes() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue.filter((code) => typeof code === "string")
      : [];
  } catch {
    return [];
  }
}

export default function Watchlist({ stocks = [] }) {
  const [query, setQuery] = useState("");
  const [savedCodes, setSavedCodes] = useState([]);
  const [isReady, setIsReady] = useState(false);

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
    const keyword = query.trim().toLowerCase();

    if (!keyword) return [];

    return stocks
      .filter((stock) => {
        const name = stock.name.toLowerCase();
        const code = stock.code.toLowerCase();

        return name.includes(keyword) || code.includes(keyword);
      })
      .slice(0, MAX_SEARCH_RESULTS);
  }, [query, stocks]);

  useEffect(() => {
    setSavedCodes(readStoredCodes());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCodes));
  }, [isReady, savedCodes]);

  function addStock(code) {
    setSavedCodes((currentCodes) => {
      if (currentCodes.includes(code)) return currentCodes;
      return [...currentCodes, code];
    });
    setQuery("");
  }

  function removeStock(code) {
    setSavedCodes((currentCodes) => currentCodes.filter((currentCode) => currentCode !== code));
  }

  function toggleStock(code) {
    if (savedCodeSet.has(code)) {
      removeStock(code);
      return;
    }

    addStock(code);
  }

  return (
    <section className={styles.watchlistPanel}>
      <div className={styles.watchlistHeader}>
        <div className={styles.sectionTitle}>
          <h2>관심 종목</h2>
          <span>{selectedStocks.length.toLocaleString("ko-KR")}개 선택</span>
        </div>
        <div className={styles.stockSearch}>
          <label className={styles.searchLabel} htmlFor="watchlist-search">
            종목 검색
          </label>
          <input
            id="watchlist-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="종목명 또는 코드"
            autoComplete="off"
          />
          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((stock) => {
                const isSaved = savedCodeSet.has(stock.code);

                return (
                  <button
                    className={styles.searchResult}
                    key={stock.code}
                    type="button"
                    onClick={() => toggleStock(stock.code)}
                    aria-label={`${stock.name} ${isSaved ? "관심 종목 해제" : "관심 종목 추가"}`}
                  >
                    <span>
                      <strong>{stock.name}</strong>
                      <small>
                        {stock.market} · {stock.code}
                      </small>
                    </span>
                    <em>{isSaved ? "해제" : "추가"}</em>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedStocks.length > 0 ? (
        <div className={styles.watchlistCards}>
          {selectedStocks.map((stock) => (
            <article className={styles.watchCard} key={stock.code}>
              <button
                className={styles.removeWatch}
                type="button"
                onClick={() => removeStock(stock.code)}
                aria-label={`${stock.name} 관심 종목 해제`}
                title="관심 종목 해제"
              >
                x
              </button>
              <div className={styles.watchName}>
                <strong>{stock.name}</strong>
                <span>
                  {stock.market} · {stock.code}
                </span>
              </div>
              <div className={styles.watchPrice}>
                <span>현재가</span>
                <strong>{stock.price}원</strong>
              </div>
              <div className={`${styles.watchRate} ${movementClass(stock.changeRate)}`}>
                {formatRate(stock.changeRate)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.emptyWatchlist}>
          종목명이나 종목 코드를 검색해 관심 종목으로 추가하면 이곳에 카드로 모아 표시됩니다.
        </p>
      )}
    </section>
  );
}
