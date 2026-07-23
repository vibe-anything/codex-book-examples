"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const MAX_SEARCH_RESULTS = 8;

function normalizeCodes(value) {
  return Array.isArray(value) ? value.filter((code) => typeof code === "string") : [];
}

function formatRate(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function movementClass(value) {
  if (value > 0) return styles.positive;
  if (value < 0) return styles.negative;
  return styles.neutral;
}

async function requestWatchlist(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Watchlist request failed.");
  }

  return normalizeCodes(body.codes);
}

export default function Watchlist({ stocks = [], initialSavedCodes = [] }) {
  const [query, setQuery] = useState("");
  const [savedCodes, setSavedCodes] = useState(() => normalizeCodes(initialSavedCodes));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    let isMounted = true;

    async function loadWatchlist() {
      try {
        const codes = await requestWatchlist("/api/watchlist");

        if (isMounted) {
          setSavedCodes(codes);
          setErrorMessage("");
        }
      } catch {
        if (isMounted) {
          setErrorMessage("관심 종목을 불러오지 못했습니다.");
        }
      }
    }

    loadWatchlist();

    return () => {
      isMounted = false;
    };
  }, []);

  async function addStock(code) {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const codes = await requestWatchlist("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockCode: code }),
      });

      setSavedCodes(codes);
      setQuery("");
    } catch {
      setErrorMessage("관심 종목을 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeStock(code) {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const codes = await requestWatchlist(
        `/api/watchlist?stockCode=${encodeURIComponent(code)}`,
        { method: "DELETE" }
      );

      setSavedCodes(codes);
    } catch {
      setErrorMessage("관심 종목을 해제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
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
                    disabled={isSaving}
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

      {errorMessage && <p className={styles.watchlistStatus}>{errorMessage}</p>}

      {selectedStocks.length > 0 ? (
        <div className={styles.watchlistCards}>
          {selectedStocks.map((stock) => (
            <article className={styles.watchCard} key={stock.code}>
              <button
                className={styles.removeWatch}
                type="button"
                disabled={isSaving}
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
