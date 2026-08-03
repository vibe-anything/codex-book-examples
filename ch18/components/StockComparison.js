"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/market";
import {
  COMPARISON_STORAGE_KEY,
  describeStockChange,
  getDefaultComparisonCodes,
  restoreComparisonCodes,
  updateComparisonCodes,
} from "@/lib/stockComparison";
import styles from "./StockComparison.module.css";

function readStoredCodes(stocks) {
  try {
    const storedValue = JSON.parse(
      window.localStorage.getItem(COMPARISON_STORAGE_KEY) ?? "null",
    );
    return restoreComparisonCodes(stocks, storedValue);
  } catch {
    return getDefaultComparisonCodes(stocks);
  }
}

export function StockComparison({ stocks, asOf, dataNotice }) {
  const [selectedCodes, setSelectedCodes] = useState(() =>
    getDefaultComparisonCodes(stocks),
  );
  const [selectionError, setSelectionError] = useState("");
  const [isStorageReady, setIsStorageReady] = useState(false);
  const stockByCode = useMemo(
    () => new Map(stocks.map((stock) => [String(stock.code), stock])),
    [stocks],
  );

  useEffect(() => {
    setSelectedCodes(readStoredCodes(stocks));
    setIsStorageReady(true);
  }, [stocks]);

  useEffect(() => {
    if (!isStorageReady || selectedCodes.length !== 2) return;

    try {
      window.localStorage.setItem(
        COMPARISON_STORAGE_KEY,
        JSON.stringify(selectedCodes),
      );
    } catch {
      // 저장소가 제한된 환경에서도 현재 비교 기능은 유지한다.
    }
  }, [isStorageReady, selectedCodes]);

  function selectStock(slot, nextCode) {
    const result = updateComparisonCodes(
      stocks,
      selectedCodes,
      slot,
      nextCode,
    );
    setSelectedCodes(result.codes);
    setSelectionError(result.error);
  }

  const selectedStocks = selectedCodes
    .map((code) => stockByCode.get(code))
    .filter(Boolean);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{asOf} 기준</p>
          <h1 className={styles.title}>종목 비교</h1>
          <p className={styles.description}>
            두 종목의 현재가와 오늘 등락률을 한눈에 비교하세요.
          </p>
        </div>
        <Link className={styles.backLink} href="/">
          시장 홈으로
        </Link>
      </header>

      {stocks.length < 2 ? (
        <section className={styles.empty} aria-labelledby="comparison-empty-title">
          <h2 id="comparison-empty-title">비교할 종목이 부족합니다</h2>
          <p>서로 다른 종목이 두 개 이상 준비되면 비교할 수 있습니다.</p>
        </section>
      ) : (
        <>
          <section className={styles.panel} aria-label="비교할 종목 선택">
            <div className={styles.selectors}>
              {[0, 1].map((slot) => (
                <label className={styles.selector} key={slot}>
                  {slot === 0 ? "첫 번째 종목" : "두 번째 종목"}
                  <select
                    value={selectedCodes[slot] ?? ""}
                    onChange={(event) => selectStock(slot, event.target.value)}
                    aria-describedby="comparison-selection-message"
                  >
                    {stocks.map((stock) => (
                      <option value={stock.code} key={stock.code}>
                        {stock.name} ({stock.code})
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className={styles.storageNote}>
              선택한 두 종목은 이 브라우저에 저장됩니다.
            </p>
            <p
              className={styles.error}
              id="comparison-selection-message"
              role={selectionError ? "alert" : undefined}
              aria-live="polite"
            >
              {selectionError}
            </p>
          </section>

          <section className={styles.cards} aria-label="종목 비교 결과">
            {selectedStocks.map((stock) => {
              const change = describeStockChange(stock.changePercent);

              return (
                <article className={styles.card} key={stock.code}>
                  <div className={styles.cardHeading}>
                    <h2>{stock.name}</h2>
                    <p className={styles.code}>{stock.code}</p>
                  </div>
                  <p className={styles.priceLabel}>현재가</p>
                  <p className={styles.price}>{formatPrice(stock.price)}</p>
                  <div className={styles.changeRow}>
                    <span className={styles.changeLabel}>오늘 등락률</span>
                    <span
                      className={`${styles.change} ${styles[change.tone]}`}
                      aria-label={`${stock.name} 오늘 등락률 ${change.accessibleText}`}
                    >
                      <span>{change.label}</span>
                      <span>{change.signedPercent}</span>
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      <p className={styles.dataNote}>{dataNotice}</p>
    </main>
  );
}
