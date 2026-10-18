# 12장 시작 상태: 예시 데이터로 도는 주식 대시보드

12장은 이 상태에서 출발한다. 화면은 고정 예시 데이터를 보여 주는 밝은 토스풍의 데스크톱 전용 대시보드다. `/plan`으로 기본 화면을 세우고 디자인을 다듬었지만 인증키도, 실제 시세도 없다. `data/marketSnapshot.js`의 고정 값만 읽으므로 받자마자 그대로 돌아간다. 12장 본문은 여기에 공공데이터포털 실데이터를 연결해 나간다. 만드는 과정은 `PROMPTS.md`에 있다.

```bash
npm install
npm run dev
```

공공데이터포털 인증 키는 프로젝트 루트의 `.env`에 직접 입력한다.

```dotenv
DATA_GO_KR_SERVICE_KEY=
```

Next.js가 `.env`를 자동으로 읽는다. 값을 변경한 뒤에는 개발 서버를 다시 시작한다.
서버의 공공데이터 API 호출 코드에서는 `lib/dataGoKr.js`의
`getDataGoKrServiceKey()`로 키를 읽는다. 키가 비어 있으면 이 함수는 설정 안내
오류를 발생시킨다. 키를 코드에 직접 쓰거나 `NEXT_PUBLIC_` 환경 변수 및
클라이언트에 전달하는 데이터에 넣지 않는다. `.env`는 Git에서 제외된다.
현재 화면은 서버에서 Supabase `public.daily_prices`의 최신 `trade_date`를 찾고,
그 날짜의 전체 종목을 페이지로 나누어 읽는다. 기준일과 종가 여부를 화면에 표시한다.
종가·등락률·거래대금은 `close_price`, `change_percent`, `trading_value`를 사용한다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

[Supabase REST API](https://supabase.com/docs/guides/api/quickstart)를 GET으로만 호출한다.
추가 패키지나 비밀 키는 필요하지 않으며, 공개 키의 읽기 권한이 필요하다.
앱에는 시세 추가·수정·삭제 경로가 없다. 관심 종목은 기존처럼 localStorage에만 저장한다.
Supabase 조회는 캐시하지 않고 요청별 제한 시간은 15초다.
Supabase에서는 종목 시세만 읽어 관심 종목과 주요 종목 순위에 사용한다.
지수 카드·시장 열기·업종 히트맵은 Supabase 성공 여부와 관계없이 기존 공공데이터
API로 채우며, 화면의 네 영역 구조를 유지한다. API 실패 시 이 시장 요약 영역만
예시 데이터로 표시하고 안내한다. 종목과 시장 요약의 기준일이 다르면 각각 표시한다.

설정 누락, 빈 테이블, 읽기 실패, 유효하지 않거나 불완전한 시세는 기존
공공데이터 API로 전환한다. API도 실패할 때만 예시 데이터와 실패 안내를 표시한다.
API 응답 캐시는 1시간이며 각 요청 제한 시간은 15초다.
API 사용 시 지수 그래프는 최근 일별 종가이며 업종 매핑은
[DATA_REPORT.md](./DATA_REPORT.md)를 따른다.

## 데이터 이용 조건

공공데이터포털의 금융위원회 지수시세정보·주식시세정보는 상세 페이지의 이용허락범위가 공공누리 제4유형이고, 제3자 제공과 재배포를 금지한다. 그래서 이 대시보드는 내가 보는 용도로만 쓴다. 배포하면 주소는 Vercel 계정으로 로그인해야 열리게 잠근다. 저장소에는 실제 시세를 넣지 않고 `data/marketSnapshot.js`의 예시 데이터만 둔다.
