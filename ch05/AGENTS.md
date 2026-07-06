# Repository Guidelines

## 프로젝트 구조 및 모듈 구성

이 장은 부동산 실거래가 조회 예제를 위한 작은 Node.js ESM 애플리케이션입니다. HTTP 서버, API 입력 검증, 모의 거래 조회, 정적 파일 라우팅은 `server.js`에 있습니다. 브라우저 자산은 `public/` 아래의 `index.html`, `styles.css`, `app.js`에 있습니다. 테스트는 서버 옆의 `server.test.js`에 있으며, `server.js`에서 내보낸 함수를 직접 가져와 검증합니다. `PROMPTS.md`는 장별 프롬프트 자료이며 런타임에는 사용하지 않습니다.

## 빌드, 테스트, 개발 명령

- `npm start`: `node server.js`를 실행하며, `PORT`가 없으면 `http://localhost:3000`에서 앱을 제공합니다.
- `npm test`: Node 내장 테스트 러너인 `node --test`를 실행합니다.
- `PORT=4000 npm start`: 로컬 서버를 다른 포트에서 실행합니다.

별도의 빌드 단계나 번들러는 없습니다. 파일을 직접 수정한 뒤 브라우저를 새로고침하면 됩니다.

## 코딩 스타일 및 이름 규칙

최신 JavaScript 모듈 문법(`import`/`export`)을 사용하고, 테스트에서 직접 검증해야 하는 서버 헬퍼는 내보낼 수 있게 유지합니다. 기존 스타일을 따르세요: 공백 2칸 들여쓰기, 세미콜론, 작은따옴표, 기본적으로 `const` 사용, `validateQuery`, `fetchTransactions`, `handleStatic`처럼 설명적인 camelCase 이름을 사용합니다. 공개 API 응답은 `status`, `summary`, `items` 필드를 명확히 유지합니다. 검증, 데이터 조회, 라우팅, 응답 포맷팅의 책임을 작은 함수로 나누는 방식을 선호합니다.

## 테스트 지침

테스트는 `node:test`와 `node:assert/strict`를 사용합니다. 쿼리 검증, 거래 상태 처리, 응답 형태를 변경할 때는 `server.test.js`에 테스트를 추가하거나 갱신하세요. 테스트 이름은 관찰 가능한 동작을 설명하게 작성합니다. 예: `it('rejects invalid input before API work', ...)`. `fetchTransactions(query, env)`처럼 환경 객체를 주입하는 방식을 사용하고, 테스트에서 전역 `process.env`를 직접 변경하지 않는 편이 좋습니다.

## 커밋 및 풀 리퀘스트 지침

최근 커밋은 짧은 명령형 요약을 사용하며, `ch17:` 같은 장 범위나 `chore:` 같은 유지보수 범위를 붙입니다. 이 장에서는 `ch05: add transaction validation test`, `ch05: update lookup UI` 같은 형식을 권장합니다. 풀 리퀘스트에는 사용자에게 보이는 변경 사항, 실행한 테스트 명령, `public/` UI가 바뀐 경우 스크린샷을 포함하세요. `PUBLIC_DATA_API_KEY`처럼 필요한 환경 변수도 명시합니다.

## 보안 및 설정 팁

`PUBLIC_DATA_API_KEY`는 서버 전용으로 유지하세요. `public/` 파일에 넣거나 로컬 비밀 파일을 커밋하지 마세요. 로컬 상태 테스트에는 `MOCK_EMPTY=true`, `MOCK_API_FAILURE=true` 같은 모의 플래그를 사용합니다.
