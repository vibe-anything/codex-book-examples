# Supabase 시세를 읽는 국내 주식 대시보드

Supabase `daily_quotes` 테이블의 최신 기준일 시세를 읽어 국내 주식 시장을 보여 준다.
Supabase에 데이터가 없거나 조회에 실패하면 금융위원회 공공데이터포털 API를 사용하고,
두 소스가 모두 실패할 때만 예시 데이터와 안내를 표시한다.

```bash
npm install
npm run dev
```

공공데이터포털 인증키는 프로젝트 루트의 `.env`에 입력한다.

```dotenv
DATA_GO_KR_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

공공데이터포털 키는 서버 코드의 `getDataGoKrServiceKey()`로만 읽고 소스 코드에
직접 적지 않는다. Supabase 조회에는 URL과 publishable key 환경 변수를 사용한다.

## 화면별 데이터

앱은 publishable key로 `daily_quotes`를 GET 조회만 한다. 시세를 추가·수정·삭제하는
앱 경로는 없고, 관심 종목은 기존처럼 브라우저 `localStorage`에만 저장한다.

| 화면 | 데이터 | 처리 방식 |
| --- | --- | --- |
| 관심 종목 | 종가, 등락률 | Supabase 최신 시세와 `localStorage`의 종목코드 연결 |
| KOSPI·KOSDAQ 카드 | 종가, 전일 대비, 등락률 | 공공데이터 지수시세정보 |
| 시장 열기 | 3% 이상 상승 종목 비율 | 공공데이터 KOSPI·KOSDAQ 종목으로 계산 |
| 업종 히트맵 | 8개 업종 등락률 | 공공데이터의 정확한 KRX 업종 지수 |
| 종목 순위 | 상승률·하락률·거래대금 상위 5개 | Supabase 최신 시세를 정렬해 계산 |
| 기준일 | 최신 `trade_date` | 화면 상단에 함께 표시 |

업종 목록 12개는 유지한다. `반도체·자동차·은행·증권·건설·철강·운송·방송통신`은
각각 같은 이름의 KRX 업종 지수를 사용한다. `조선·게임·2차전지`는 공개 응답에
`TOP 10` 테마 지수만 있어 사용하지 않으며, `화장품`은 대응 업종 지수가 없어
코드의 업종 목록에는 남겨 두되 네 타일은 렌더링하지 않는다.

Supabase에서는 종목 시세만 읽는다. 지수 카드·시장 열기·업종 히트맵은 항상 기존
공공 API 경로로 채워 네 화면 영역을 유지한다. Supabase 조회 실패 시 공공 API의
종목 시세까지 사용하며, 필요한 외부 데이터가 실패한 영역만
`data/marketSnapshot.js`의 예시 데이터로 보완하고 출처를 안내한다.

생성 환경: codex-cli 0.146.0, 2026-08-02.
