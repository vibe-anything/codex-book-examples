# Market Dashboard 앱별 완료 기준

이 기준은 `codex-vercel-example`에만 적용하라.

## 1. 최신 Production 배포와 커밋

- 가장 최근 Production 배포가 `READY`이고 배포 상세의 Git commit SHA가 공유 대상 전체 SHA와 같으면 `PASS`이다.
- 최신 Production 배포가 없거나, Ready가 아니거나, 커밋이 다르거나, Production 여부 또는 SHA를 확인할 수 없으면 `BLOCKED`이다.
- 사용자가 공유 대상 커밋을 지정하지 않았고 작업 트리에 미커밋 변경이 있으면 비교 대상을 확정할 수 없으므로 `BLOCKED`이다.

## 2. 배포 화면과 Watchlist API

### 화면

- 화면·API 확인은 프로젝트의 Production 대표 주소(alias)를 기준으로 한다. 불변 배포 URL은 Deployment Protection이 켜져 있으면 로그인 화면이 떠서 판정 기준으로 쓰지 않는다.
- 대표 주소가 로그인·보호 화면으로 열리면 공유 대상이 접근할 수 없는 상태이므로 `BLOCKED`이다.
- 루트 페이지가 HTTP 200으로 열리고 `국내 시장 대시보드`가 최종 렌더링되어야 한다.
- 다음 기준일 형식 중 하나가 보여야 한다.
  - `기준 YYYY-MM-DD`
  - `기준 지수 YYYY-MM-DD · 종목 YYYY-MM-DD`
- 다음 실제 데이터 출처 중 하나가 보여야 한다.
  - `공공데이터포털 금융위원회 지수시세정보/주식시세정보 기준, 상장종목정보로 종목 코드 검증`
  - `Supabase daily_stock_prices 기준, 지수와 업종은 공공데이터포털 금융위원회 지수시세정보 기준`
- 제목, 기준일, 실제 데이터 출처가 모두 일관되게 보이면 `PASS`이다.
- 페이지는 열리지만 `예시 데이터` 또는 `공공데이터포털 수집 실패 시 표시하는 예시 데이터입니다.`가 보이면 `WARNING`이다.
- 페이지가 열리지 않거나 제목·기준일·출처 중 하나라도 없거나 서로 모순되면 `BLOCKED`이다.
- 이 앱은 서버 렌더링이라 대표 주소의 GET 응답 HTML로 제목·기준일·출처를 판정해도 된다. 인앱 브라우저를 쓸 수 있으면 최종 렌더링까지 확인한다. GET 확인조차 불가능하면 `BLOCKED`이다.

### Watchlist API

- 대표 주소와 같은 origin의 `GET /api/watchlist`가 HTTP 200을 반환하고 JSON 본문이 `{ "codes": [...] }` 형태이며 `codes`가 배열이면 `PASS`이다.
- 200이 아니거나 JSON 형태가 다르거나 응답을 확인할 수 없으면 `BLOCKED`이다.
- `POST`와 `DELETE`는 Supabase 데이터를 변경하므로 사용하지 않는다.

화면과 API 중 더 심각한 상태를 2번 결과로 사용하라.

## 3. 최근 런타임 5xx

- 관찰 구간은 최신 Production 배포의 최근 24시간이다. 배포된 지 24시간이 안 됐으면 배포 시각부터 현재까지로 기록한다.
- 5xx가 없으면 `PASS`이다.
- 5xx가 한 번만 발생했거나 서로 다른 경로·상태·오류 지문에서 각각 한 번씩만 발생했으면 `WARNING`이다.
- 동일 경로와 상태 코드에서 같은 오류 지문이 2회 이상 발생하면 반복 오류로 보고 `BLOCKED`이다. 메시지를 안전하게 지문화할 수 없으면 동일 경로와 상태 코드의 2회 이상을 반복으로 간주한다.
- 로그 권한, 보존 기간, 도구 문제로 관찰 구간을 확인할 수 없으면 `BLOCKED`이다.

## 4. 환경변수 계약

이 앱의 계약(필수 이름)은 다음 세 개이며, `.env.sample`의 이름 목록과 항상 같아야 한다.

- `DATA_GO_KR_SERVICE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

- 요구 이름은 공유 대상 커밋의 코드에서 추출하라. `process.env.NAME` 직접 접근, `process.env[이름상수]` 접근, 이름 상수 선언(`"SUPABASE_URL"` 같은 문자열을 담은 `*_ENV` 상수)을 모두 검색 대상으로 삼는다.
- 코드가 요구하는 이름이 모두 계약(위 목록과 `.env.sample`)에 있으면 `PASS`이다.
- 코드가 계약에 없는 이름을 요구하면 `BLOCKED`이다. 기존 이름과 한두 글자 차이면 오타 가능성을 진단하고, 의도한 새 변수라면 `.env.sample`·이 문서 갱신과 Vercel Production 등록 확인을 다음 행동으로 안내하라.
- 계약에는 있는데 코드가 더 이상 쓰지 않는 이름은 `WARNING`이다.
- 값의 조회, 유효성 검사, 출력은 범위 밖이다. Vercel에 등록된 이름 조회도 이 Skill의 범위 밖이다. 등록 변수가 작동한다는 간접 증거는 2번의 실제 데이터 출처 표시로 확인한다.

## 5. Git env 파일과 비밀값

- 현재 추적 파일과 모든 reachable commit 이력에 `.env`, `.env.local`, `.env.production` 및 다른 `.env.*` 실환경 파일이 없어야 한다.
- `.env.sample`은 각 값이 비어 있거나 `example`, `placeholder`, `changeme`, `your_*` 같은 명백한 예시일 때만 허용한다. 값 자체는 출력하지 마라. 현재 앱은 세 키가 빈 `.env.sample`을 사용한다.
- private key 파일, credential 파일, 실제 API key, access token, password, JWT 등 고신뢰 비밀이 현재 추적 파일이나 이력에서 탐지되면 `BLOCKED`이다.
- 파일명이나 패턴이 의심스럽지만 실제 비밀인지 값 노출 없이 확정할 수 없으면 `WARNING`이다.
- 전체 이력을 값 노출 없이 검사할 방법이 없으면 `BLOCKED`이다.
- 허용된 `.env.sample` 외에 의심 파일이나 비밀 탐지가 없으면 `PASS`이다.
