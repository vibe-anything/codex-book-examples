"use client";

import { useEffect, useMemo, useState } from "react";
import { changeTone, formatPrice, formatSigned } from "@/lib/market";
import {
  COMPARISON_STORAGE_KEY,
  normalizeComparisonCodes,
  parseSavedComparisonCodes,
  selectComparisonStock,
} from "@/lib/stockComparison";

function readSavedComparisonCodes() {
  try {
    return parseSavedComparisonCodes(window.localStorage.getItem(COMPARISON_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function StockComparison({ stocks }) {
  const [selectedCodes, setSelectedCodes] = useState(() => normalizeComparisonCodes(stocks));
  const [error, setError] = useState("");
  const [isStorageReady, setIsStorageReady] = useState(false);

  const stockByCode = useMemo(
    () => new Map(stocks.map((stock) => [stock.code, stock])),
    [stocks]
  );
  const selectedStocks = selectedCodes.map((code) => stockByCode.get(code)).filter(Boolean);

  useEffect(() => {
    setSelectedCodes(normalizeComparisonCodes(stocks, readSavedComparisonCodes()));
    setIsStorageReady(true);
  }, [stocks]);

  useEffect(() => {
    if (!isStorageReady) return;

    try {
      window.localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(selectedCodes));
    } catch {
      // 저장 공간을 사용할 수 없어도 현재 화면의 비교 상태는 유지한다.
    }
  }, [isStorageReady, selectedCodes]);

  function changeStock(slotIndex, nextCode) {
    const result = selectComparisonStock(selectedCodes, slotIndex, nextCode);
    setError(result.error);
    if (!result.error) setSelectedCodes(result.selectedCodes);
  }

  return (
    <section className="stock-comparison" aria-labelledby="comparison-title">
      <div className="section-heading comparison-heading">
        <div>
          <h2 id="comparison-title">종목 비교</h2>
          <p className="section-note">두 종목의 현재가와 오늘 등락률을 한눈에 비교해 보세요.</p>
        </div>
      </div>

      {selectedStocks.length === 2 ? (
        <div className="comparison-panel panel">
          <div className="comparison-grid">
            {selectedStocks.map((stock, slotIndex) => {
              const tone = changeTone(stock.changePercent);

              return (
                <article className="comparison-stock" key={slotIndex}>
                  <label htmlFor={`comparison-stock-${slotIndex}`}>
                    비교 종목 {slotIndex + 1}
                  </label>
                  <select
                    id={`comparison-stock-${slotIndex}`}
                    value={stock.code}
                    onChange={(event) => changeStock(slotIndex, event.target.value)}
                    aria-describedby={error ? "comparison-error" : undefined}
                  >
                    {stocks.map((option) => (
                      <option value={option.code} key={option.code}>
                        {option.name} ({option.code})
                      </option>
                    ))}
                  </select>

                  <div className="comparison-stock-name">
                    <strong>{stock.name}</strong>
                    <span>{stock.market} · {stock.code}</span>
                  </div>
                  <dl className="comparison-quote">
                    <div>
                      <dt>현재가</dt>
                      <dd>{formatPrice(stock.price)}</dd>
                    </div>
                    <div>
                      <dt>오늘 등락률</dt>
                      <dd className={tone}>{formatSigned(stock.changePercent, 2)}%</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
          <p
            id="comparison-error"
            className={`comparison-error ${error ? "visible" : ""}`}
            role="alert"
          >
            {error || "\u00a0"}
          </p>
        </div>
      ) : (
        <p className="comparison-unavailable panel">
          비교하려면 서로 다른 종목 데이터가 두 개 이상 필요합니다.
        </p>
      )}
    </section>
  );
}
