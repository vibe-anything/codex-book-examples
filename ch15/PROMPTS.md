# 15장 요청문 — 클라우드에 배포하고 검증하기

이 폴더는 15장을 **끝낸 직후** 상태다. `ch14`를 복사한 뒤 아래 순서로 만들었다.
GitHub 저장소·Vercel 프로젝트·환경변수 입력은 **사람 몫**이다(이 폴더를 만든 실행에서는
대시보드 대신 gh CLI·Vercel MCP·vercel CLI로 같은 상태를 만들었다 — 문서고 build-log 참고).

## 1. 공개 전 점검 (§15.2)

```text
공개 전 점검을 부탁해.
- .env가 Git의 추적 파일이나 커밋 기록에 들어 있지 않은지 확인해줘.
- 코드와 설정 파일에 인증키 값이 직접 적힌 곳이 없는지 찾아줘.
- .env 파일 자체는 열지 말고, 문제를 찾으면 고치기 전에 먼저 알려줘.
```

## 2. 커밋과 GitHub 푸시 (§15.1 전제)

배포 전 변경을 커밋하고 GitHub 비공개 저장소에 푸시한다(이 실행: `52dbc89`,
github.com/forest-lim-dev/korea-market-dashboard). 본문 흐름은 Vercel 대시보드에서
저장소를 Import하는 것이고, 이 폴더는 Vercel MCP 직접 배포로 같은 결과를 만들었다.

본문에서 푸시를 맡길 때 쓰는 요청문은 다음과 같다.

```text
이 프로젝트를 GitHub 저장소 https://github.com/<내 계정>/stock-dashboard.git 에 올려줘.
원격 연결부터 푸시까지 끝나면 무엇을 했는지 알려줘.
```

## 3. 첫 배포와 진단 (§15.4~15.5)

환경변수 없이 첫 프로덕션 배포 → 화면에 '예시 데이터' 안내가 남는 증상을 확인한다.
로그를 Codex와 함께 보려면 먼저 Vercel MCP를 등록한다(브라우저 승인 창이 뜬다).

```bash
codex mcp add vercel --url https://mcp.vercel.com
```

그다음:

```text
방금 Vercel에 배포한 대시보드가 예시 데이터로 돌아.
배포 상태랑 최근 로그를 확인해서, 내가 Vercel에서 무엇을 설정해야 하는지 알려줘.
```

→ Codex가 배포 상태(Ready)와 로그를 대조해 환경변수 세 개
(`DATA_GO_KR_SERVICE_KEY`·`NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
누락을 짚는다.

## 4. 환경변수 입력과 재배포·확인 (§15.6)

사람이 Vercel Settings의 Environment Variables에 세 값을 넣고 재배포한 뒤:

```text
재배포 끝났으면 배포 주소를 직접 열어서 확인해줘.
- 화면 안내에서 '예시 데이터' 문구가 사라졌는지
- 실제 시세의 출처와 기준일이 보이는지
- 최근 로그에 같은 오류가 다시 생기지 않았는지
```

이 실행의 결과: 환경변수 반영·Supabase 종목 시세 정상·기준일 표시까지 확인.
단 **공공데이터포털 API는 Vercel 서버(해외)에서 시간 초과**로 지수·시장 열기·업종
영역이 예시 데이터로 남았다(배지가 출처를 구분 표시). 지역 제약의 실측 기록이다.
