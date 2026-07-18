"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./stockComparison.module.css";
import {
  COMPARISON_STORAGE_KEY,
  formatChangeRate,
  movementKind,
  movementLabel,
  normalizeComparisonCodes,
  parseStoredComparison,
  updateComparisonSelection,
} from "../lib/stockComparison.js";

const SELECT_LABELS = ["첫 번째 종목", "두 번째 종목"];

function movementClass(changeRate) {
  const kind = movementKind(changeRate);

  if (kind === "positive") return styles.positive;
  if (kind === "negative") return styles.negative;
  return styles.neutral;
}

function StockCard({ stock, position }) {
  return (
    <article className={styles.stockCard} aria-labelledby={`comparison-stock-${position}`}>
      <div className={styles.stockIdentity}>
        <span>{SELECT_LABELS[position]}</span>
        <h2 id={`comparison-stock-${position}`}>{stock.name}</h2>
        <small>
          {stock.market} · {stock.code}
        </small>
      </div>

      <dl className={styles.stockValues}>
        <div>
          <dt>현재가</dt>
          <dd>{stock.price}원</dd>
        </div>
        <div>
          <dt>오늘 등락률</dt>
          <dd className={`${styles.rate} ${movementClass(stock.changeRate)}`}>
            <span>{movementLabel(stock.changeRate)}</span>
            <strong>{formatChangeRate(stock.changeRate)}</strong>
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function StockComparison({ stocks = [] }) {
  const [selectedCodes, setSelectedCodes] = useState(() =>
    normalizeComparisonCodes(stocks, [])
  );
  const [storageReady, setStorageReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const stockByCode = useMemo(
    () => new Map(stocks.map((stock) => [stock.code, stock])),
    [stocks]
  );
  const selectedStocks = useMemo(
    () => selectedCodes.map((code) => stockByCode.get(code)).filter(Boolean),
    [selectedCodes, stockByCode]
  );

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(COMPARISON_STORAGE_KEY);
      setSelectedCodes(parseStoredComparison(storedValue, stocks));
    } catch {
      setSelectedCodes(normalizeComparisonCodes(stocks, []));
      setStatusMessage("저장된 종목 선택을 불러오지 못해 기본 종목을 표시합니다.");
    } finally {
      setStorageReady(true);
    }
  }, [stocks]);

  useEffect(() => {
    if (!storageReady || selectedCodes.length !== 2) return;

    try {
      window.localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(selectedCodes));
    } catch {
      setStatusMessage("종목 선택을 이 브라우저에 저장하지 못했습니다.");
    }
  }, [selectedCodes, storageReady]);

  function selectStock(position, nextCode) {
    const result = updateComparisonSelection(stocks, selectedCodes, position, nextCode);

    if (result.error) {
      setStatusMessage(result.error);
      return;
    }

    setSelectedCodes(result.codes);
    setStatusMessage("");
  }

  if (selectedStocks.length < 2) {
    return (
      <section className={styles.unavailable} role="status">
        비교하려면 서로 다른 종목이 두 개 이상 필요합니다.
      </section>
    );
  }

  return (
    <section aria-labelledby="comparison-heading">
      <div className={styles.controls}>
        <div>
          <h2 id="comparison-heading">비교할 종목</h2>
          <p>각 목록에서 서로 다른 종목을 골라 보세요.</p>
        </div>
        <div className={styles.selectGrid}>
          {SELECT_LABELS.map((label, position) => (
            <label key={label}>
              <span>{label}</span>
              <select
                value={selectedCodes[position]}
                onChange={(event) => selectStock(position, event.target.value)}
                aria-describedby={statusMessage ? "comparison-status" : undefined}
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
      </div>

      {statusMessage && (
        <p className={styles.status} id="comparison-status" role="alert" aria-live="assertive">
          {statusMessage}
        </p>
      )}

      <div className={styles.cardGrid}>
        {selectedStocks.map((stock, position) => (
          <StockCard stock={stock} position={position} key={stock.code} />
        ))}
      </div>
    </section>
  );
}
