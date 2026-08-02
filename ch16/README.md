# 15장 완료 상태: Supabase에 시세를 쌓아 읽는 주식 대시보드

이 폴더는 15장을 끝낸 상태다. 앞 상태는 같은 저장소의 `ch14`다.

일별 시세를 Supabase 테이블에 쌓고, 대시보드가 그 테이블의 최신 기준일 데이터를 읽는다.
화면에는 데이터 출처 배지와 기준일이 함께 표시된다. 조회 순서는 Supabase → 공공데이터
API → 예시 데이터다. 이 실행에서 Supabase에는 종목 시세만 저장했으므로, Supabase가
소스일 때 지수 카드·업종 히트맵은 화면에서 빠진다(구현은 실행마다 다를 수 있다).

관심 종목은 계속 localStorage에만 있고, 앱에는 시세를 쓰는 경로가 없다. 쓰기는 RLS가
거부한다.

## 실행 방법

먼저 `.env`를 만들고 `.env.sample`의 이름 세 개를 채운다. `DATA_GO_KR_SERVICE_KEY`는
공공데이터포털 인증키, 나머지 둘은 Supabase 프로젝트의 URL과 publishable key다.
랩 재현이라면 로컬 스택(`supabase start`)의 URL·anon key로도 된다. Supabase 값이 없거나
테이블이 비어 있으면 공공데이터 API로, 그것도 실패하면 예시 데이터로 내려간다.

```bash
npm install
npm run dev
```

`npm test`(= `node --test && next build`)로 테스트 14건과 빌드를 확인한다.

생성 환경: codex-cli 0.146.0, 2026-08-03. 재구축 기록은 문서고
`vibecoding-book-documents/ch15/build-log.md`에 있다.
