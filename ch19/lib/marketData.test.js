import assert from "node:assert/strict";
import test from "node:test";

import { exampleMarketData } from "./exampleMarketData.js";
import { buildSectors } from "./marketData.js";

function indexItem(idxCsf, idxNm) {
  return {
    idxCsf,
    idxNm,
    clpr: "1000",
    vs: "10",
    fltRt: "1",
    trPrc: "100000000",
  };
}

test("공식 TOP 10 테마지수를 조선·게임·2차전지 업종으로 매핑한다", () => {
  const sectors = buildSectors([
    indexItem("테마지수", "KRX 게임 TOP 10 지수"),
    indexItem("테마지수", "KRX 조선 TOP10 지수"),
    indexItem("테마지수", "KRX 2차전지 TOP 10 지수"),
  ]);

  assert.deepEqual(
    sectors.map(({ name, sourceLabel, sourceIndexName }) => ({
      name,
      sourceLabel,
      sourceIndexName,
    })),
    [
      {
        name: "2차전지",
        sourceLabel: "테마지수",
        sourceIndexName: "KRX 2차전지 TOP 10 지수",
      },
      {
        name: "조선",
        sourceLabel: "테마지수",
        sourceIndexName: "KRX 조선 TOP10 지수",
      },
      {
        name: "게임",
        sourceLabel: "테마지수",
        sourceIndexName: "KRX 게임 TOP 10 지수",
      },
    ]
  );
});

test("이름이 비슷한 지수나 공식 매핑이 없는 화장품은 대신 사용하지 않는다", () => {
  const sectors = buildSectors([
    indexItem("테마지수", "KRX K-AI 2차전지 지수"),
    indexItem("테마지수", "KRX 화장품 TOP 10 지수"),
  ]);

  assert.deepEqual(sectors, []);
});

test("전체 수집 실패용 예시 데이터에도 검증된 세 업종과 출처를 함께 둔다", () => {
  const sectors = new Map(
    exampleMarketData.sectors.map((sector) => [sector.name, sector.sourceIndexName])
  );

  assert.equal(sectors.get("2차전지"), "KRX 2차전지 TOP 10 지수");
  assert.equal(sectors.get("조선"), "KRX 조선 TOP10 지수");
  assert.equal(sectors.get("게임"), "KRX 게임 TOP 10 지수");
  assert.equal(sectors.has("화장품"), false);
});
