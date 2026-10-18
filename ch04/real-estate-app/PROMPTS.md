# 4장 요청문 — 아파트 실거래가 앱 설계하기

이 폴더는 4장을 **끝낸 직후** 상태다. 4.2~4.5의 요청을 책 순서대로 보냈다. 5장은 이 폴더를
이어받는다.

- `PLAN.md`: 4.3에서 저장한 첫 실행 계획(4.2의 Plan Mode 결과)
- `PRD.md`: 4.4에서 저장한 PRD 초안
- `PRD_final.md`: 4.5 끝에서 Next.js 서버 방식 조건을 더한 PRD
- `server.js`·`public/`: 4.5의 계획대로 구현한 앱

질문과 계획의 모양은 실행마다 다르다. 이 폴더의 계획과 앱은 책의 그림을 찍은 실행보다 앞선
실행에서 만든 것이다.

## 1. 새 폴더에서 Codex 열기 (§4.2)

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force $HOME\Projects\real-estate-app
cd $HOME\Projects\real-estate-app
codex
```

macOS나 Linux:

```sh
mkdir -p ~/Projects/real-estate-app
cd ~/Projects/real-estate-app
codex
```

## 2. Plan Mode로 같은 요청 다시 하기 (§4.2)

`/plan`을 입력하거나 [Shift]+[Tab]을 눌러 Plan Mode로 바꾼 뒤 요청한다.

```text
/plan
```

```text
아파트 실거래가 조회하는 앱 만들어 줘.
```

책의 실행에서 고른 답은 이렇다. 질문 순서와 선택지는 실행마다 다르다.

| 질문 | 고른 답 |
| --- | --- |
| 첫 버전의 실거래 데이터 구성 | 샘플 데이터로 완성(API 키 발급은 8장) |
| 조회 방식 | 지역 검색과 거래 목록 |
| 사용 환경 | 반응형 웹앱 |
| 조회할 거래 종류(새 질문 묶음) | 매매만 |
| 화면 분위기 | 깔끔한 부동산 서비스 느낌 |

계획이 나오면 Implement this plan? 창에서 1번 Yes, implement this plan을 고른다.

## 3. 구현 결과를 실행해 확인하기 (§4.3)

구현 중에 `npm install` 같은 명령의 승인 창이 뜨면 Codex가 적은 이유를 읽고 허용한다.
구현이 끝나면 Codex 대화는 그대로 두고, 터미널을 하나 더 열어 프로젝트 폴더에서 실행한다.

```sh
npm run dev
```

터미널에 표시된 주소(보통 `http://localhost:3000`)를 브라우저로 연다. 서버는 [Ctrl]+[C]로 끈다.

그다음 실행 계획을 파일로 남긴다.

```text
구현 계획을 PLAN.md로 저장해 줘.
```

다음에 이 계획대로 다시 구현을 맡길 때는 이렇게 요청한다.

```text
PLAN.md 파일 보고 구현해 줘.
```

## 4. 제품 요구사항 문서(PRD) 쓰기 (§4.4)

```text
아파트 실거래가 PRD 초안 만들어 줘.
```

초안을 읽고 고칠 곳을 고친 뒤 파일로 저장한다.

```text
PRD.md 파일로 저장해 줘.
```

## 5. PRD를 바탕으로 실행 계획 세우기 (§4.5)

```text
/plan PRD.md를 바탕으로 실거래가 조회 앱의 실행 계획을 세워 줘.
```

계획을 쓰기 전에 Codex가 몇 가지를 되묻기도 한다. 범위를 넓히지 않는 쪽으로 답한다. 책의
실행에서는 계약월을 목업 데이터가 있는 2024년 1월로 고정하고, 거래 있음·없음·키 없음·호출 실패의
네 가지 상태는 서버 설정으로 바꿔 보게 했다.

계획이 PRD를 벗어나거나 위험한 선택을 담고 있으면 [Esc]로 멈추고 바로잡는다. 예를 들어
계획이 API 키를 브라우저 코드에 두는 방향이라면 이렇게 보낸다.

```text
그 방식은 API 키가 노출될 수 있어. 키는 서버에서만 읽는 방식으로 계획을 다시 세워 줘.
```

계획이 PRD와 안전 조건에 맞으면 구현 여부를 묻는 창에서 Yes, implement this plan을 골라
구현을 시작한다. 구현이 시작되면 PRD에 개발 방식을 적어 둔다.

```text
PRD.md에 Next.js 서버 방식으로 개발한다는 조건을 추가해 줘.
```

## 이 폴더의 앱

`npm run dev`로 띄우면 API 키가 없어도 연습용 데이터로 목록이 보인다. 실제 API 호출은 8장에서
붙인다. 나머지 상태는 서버 설정으로 켜서 본다. 하나만 켜고 서버를 다시 시작한다.

| 서버 설정 | 화면 |
| --- | --- |
| `MOCK_API_KEY_MISSING=true` | API 키가 설정되지 않았다는 안내 |
| `MOCK_EMPTY=true` | 조건에 맞는 거래가 없다는 안내 |
| `MOCK_API_FAILURE=true` | API 호출에 실패했다는 안내 |

macOS나 Linux에서는 `MOCK_EMPTY=true npm run dev`, Windows PowerShell에서는
`$env:MOCK_EMPTY='true'; npm run dev`처럼 실행한다.

키가 없을 때 목록 대신 안내만 나오던 동작은 책(4.3)에 맞춰 이렇게 고쳤다. 5장과 7장 폴더도 같다.
