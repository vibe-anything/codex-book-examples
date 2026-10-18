"use client";

import { useEffect, useState } from "react";
import { changeTone, formatPrice, formatSigned } from "@/lib/market";
import { COMPARISON_STORAGE_KEY, initialComparison, selectComparison } from "@/lib/comparison";
import styles from "./StockComparison.module.css";

export function StockComparison({ stocks }) {
  const [selection, setSelection] = useState(() => initialComparison(stocks));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COMPARISON_STORAGE_KEY) || "null");
      setSelection(initialComparison(stocks, saved));
    } catch {
      setStorageError("저장된 비교 종목을 불러오지 못했습니다. 브라우저 저장 설정을 확인해 주세요.");
    }
    setReady(true);
  }, [stocks]);

  function choose(position, code) {
    const result = selectComparison(selection, position, code);
    setError(result.error);
    if (result.error) return;
    setSelection(result.selection);
    try {
      localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(result.selection));
      setStorageError("");
    } catch {
      setStorageError("비교 종목을 저장하지 못했습니다. 새로 고침하면 선택이 사라질 수 있습니다.");
    }
  }

  return <section aria-label="두 종목 비교" className={styles.comparison}>
    <p className={styles.help}>서로 다른 두 종목을 선택해 현재가와 오늘 등락률을 비교하세요.</p>
    {stocks.length < 2 && <p role="status">비교하려면 수집된 종목이 두 개 이상 필요합니다.</p>}
    <p role="status" className={styles.notice}>{error || storageError}</p>
    <div className={styles.grid}>
      {selection.map((code, position) => {
        const stock = stocks.find(item => item.code === code);
        return <article className={styles.card} key={position}>
          <label htmlFor={`comparison-${position}`}>{position === 0 ? "첫 번째 종목" : "두 번째 종목"}</label>
          <select id={`comparison-${position}`} value={code} onChange={event => choose(position, event.target.value)} disabled={!ready || !stocks.length} aria-describedby="comparison-help">
            <option value="">종목을 선택하세요</option>
            {code && !stock && <option value={code}>{code.replace(/^mock:/, "")} (시세 없음)</option>}
            {stocks.map(item => <option key={item.code} value={item.code}>{item.name}{item.code.startsWith("mock:") ? "" : ` (${item.code})`}</option>)}
          </select>
          {stock ? <>
            <h2>{stock.name}</h2>
            <dl>
              <div><dt>현재가</dt><dd className={styles.price}>{Number.isFinite(stock.price) ? formatPrice(stock.price) : "시세 없음"}</dd></div>
              <div><dt>오늘 등락률</dt><dd className={Number.isFinite(stock.changePercent) ? changeTone(stock.changePercent) : "flat"}>{Number.isFinite(stock.changePercent) ? `${formatSigned(stock.changePercent, 2)}%` : "등락률 없음"}</dd></div>
            </dl>
          </> : <p className={styles.help}>{code ? "현재 수집된 시세가 없습니다. 다른 종목을 선택해 주세요." : "비교할 종목을 선택해 주세요."}</p>}
        </article>;
      })}
    </div>
    <p id="comparison-help" className={styles.help}>선택은 이 브라우저에 저장됩니다. 상승은 +, 하락은 − 부호로 함께 표시합니다.</p>
  </section>;
}
