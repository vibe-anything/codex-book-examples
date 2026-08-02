"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { changeTone, formatPrice } from "@/lib/market";
import {
  STOCK_COMPARE_STORAGE_KEY,
  formatComparisonRate,
  getComparableStocks,
  normalizeComparisonCodes,
  selectComparisonCode,
} from "@/lib/stockCompare";
import styles from "./StockComparison.module.css";

const SIDES = [
  { key: "left", label: "첫 번째 종목" },
  { key: "right", label: "두 번째 종목" },
];

function readStoredCodes(stocks) {
  try {
    return normalizeComparisonCodes(
      JSON.parse(window.localStorage.getItem(STOCK_COMPARE_STORAGE_KEY)),
      stocks
    );
  } catch {
    return normalizeComparisonCodes([], stocks);
  }
}

export function StockComparison({ snapshot }) {
  const stocks = useMemo(() => getComparableStocks(snapshot), [snapshot]);
  const [selectedCodes, setSelectedCodes] = useState(() => normalizeComparisonCodes([], stocks));
  const [storageReady, setStorageReady] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [conflictSide, setConflictSide] = useState("");

  const stockByCode = useMemo(
    () => new Map(stocks.map((stock) => [stock.code, stock])),
    [stocks]
  );
  const selectedStocks = selectedCodes
    .map((code) => stockByCode.get(code))
    .filter(Boolean);

  useEffect(() => {
    setSelectedCodes(readStoredCodes(stocks));
    setStorageReady(true);
  }, [stocks]);

  useEffect(() => {
    if (!storageReady || selectedCodes.length !== 2) return;

    try {
      window.localStorage.setItem(
        STOCK_COMPARE_STORAGE_KEY,
        JSON.stringify(selectedCodes)
      );
    } catch {
      // 저장 공간을 사용할 수 없어도 현재 비교 상태는 유지한다.
    }
  }, [selectedCodes, storageReady]);

  function changeStock(side, nextCode) {
    const result = selectComparisonCode(selectedCodes, side, nextCode, stocks);

    if (result.error) {
      setSelectionError(result.error);
      setConflictSide(side);
      return;
    }

    setSelectedCodes(result.codes);
    setSelectionError("");
    setConflictSide("");
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>오늘의 국내 시장</p>
          <h1>종목 비교</h1>
          <p className={styles.introduction}>현재가와 오늘 등락률을 같은 기준으로 비교해 보세요.</p>
        </div>
        <Link className={styles.homeLink} href="/">홈으로 돌아가기</Link>
      </header>

      {stocks.length >= 2 ? (
        <>
          <section className={styles.controls} aria-labelledby="comparison-options-title">
            <h2 id="comparison-options-title" className={styles.visuallyHidden}>비교할 두 종목 선택</h2>
            <div className={styles.controlGrid}>
              {SIDES.map(({ key, label }, index) => {
                const hasError = conflictSide === key;

                return (
                  <label className={styles.selectLabel} key={key}>
                    <span>{label}</span>
                    <select
                      value={selectedCodes[index] ?? ""}
                      onChange={(event) => changeStock(key, event.target.value)}
                      aria-invalid={hasError || undefined}
                      aria-describedby={hasError ? "comparison-selection-error" : undefined}
                    >
                      {stocks.map((stock) => (
                        <option value={stock.code} key={stock.code}>
                          {stock.name} ({stock.code})
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
            <p
              id="comparison-selection-error"
              className={`${styles.selectionMessage} ${selectionError ? styles.visible : ""}`}
              role={selectionError ? "alert" : undefined}
            >
              {selectionError || "서로 다른 종목을 선택해 주세요."}
            </p>
          </section>

          <section className={styles.cardGrid} aria-label="선택한 종목 비교 결과">
            {selectedStocks.map((stock) => {
              const tone = changeTone(stock.changePercent);

              return (
                <article className={styles.card} key={stock.code}>
                  <div className={styles.stockIdentity}>
                    <h2>{stock.name}</h2>
                    <p>{stock.market} · {stock.code}</p>
                  </div>
                  <dl className={styles.quoteList}>
                    <div>
                      <dt>현재가</dt>
                      <dd>{formatPrice(stock.price)}</dd>
                    </div>
                    <div>
                      <dt>오늘 등락률</dt>
                      <dd
                        className={`${styles.rate} ${styles[tone]}`}
                        data-tone={tone}
                      >
                        {formatComparisonRate(stock.changePercent)}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>
        </>
      ) : (
        <section className={styles.empty} role="status">
          비교할 종목 데이터가 부족합니다. 홈에서 데이터 상태를 확인해 주세요.
        </section>
      )}

      <footer className={styles.footer}>
        {snapshot.asOf} 기준 · {snapshot.isMock ? "예시 데이터" : "최신 일별 시세"}
      </footer>
    </main>
  );
}
