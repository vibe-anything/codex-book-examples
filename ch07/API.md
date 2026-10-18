# 아파트 실거래가 자료 API

## 개요

이 프로젝트는 아파트 매매 실거래가를 조회하기 위한 서버 API를 제공한다. 브라우저는 공공데이터 API를 직접 호출하지 않고 Next.js 서버 라우트인 `GET /api/transactions`를 호출한다. 공공데이터 인증키는 서버 환경변수 `PUBLIC_DATA_SERVICE_KEY`에서만 읽으므로 클라이언트에 노출되지 않는다.

현재 `lib/transactions.js`는 실제 공공데이터 API 대신 샘플 거래 데이터를 반환한다. 실제 외부 API 호출은 이후 이 모듈의 `fetchTransactions` 함수에서 구현할 수 있다.

## 요청

```http
GET /api/transactions?regionCode=11680&dealYmd=202401&pageNo=1&numOfRows=10
```

| 파라미터 | 필수 여부 | 형식 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `regionCode` | 선택 | 숫자 5자리 | `11680` | 법정동 지역 코드 앞 5자리. 예: 서울 강남구 `11680` |
| `dealYmd` | 필수 | `YYYYMM` | 없음 | 계약년월. 예: `202401` |
| `pageNo` | 선택 | 1 이상의 정수 | `1` | 조회할 페이지 번호 |
| `numOfRows` | 선택 | 1 이상의 정수 | `10` | 한 번에 조회할 행 수 |

형식에 맞지 않는 값이 하나라도 있으면 외부 API를 호출하지 않고 `400 Bad Request`를 반환한다.

## 성공 응답

```json
{
  "status": "SUCCESS",
  "summary": {
    "regionCode": "11680",
    "dealYmd": "202401",
    "count": 2
  },
  "items": [
    {
      "apartmentName": "은마",
      "legalDong": "대치동",
      "dealAmount": "245,000",
      "exclusiveArea": "76.79",
      "floor": "8",
      "dealDate": "2024-01-15",
      "buildYear": "1979"
    }
  ]
}
```

### 거래 항목

| 필드 | 설명 |
| --- | --- |
| `apartmentName` | 아파트 단지명 |
| `legalDong` | 법정동 이름 |
| `dealAmount` | 거래금액. 단위는 만 원 |
| `exclusiveArea` | 전용면적(㎡) |
| `floor` | 거래된 층 |
| `dealDate` | 계약일(`YYYY-MM-DD`) |
| `buildYear` | 건축년도 |

현재 샘플 데이터의 `dealAmount`는 쉼표가 포함된 문자열이다. 실제 공공데이터 응답을 연결할 때는 쉼표와 공백을 제거한 뒤 만 원 단위 숫자로 파싱하고, 화면에서 억/만 원 단위로 읽기 좋게 표시해야 한다.

## 상태값과 오류 응답

응답 본문의 `status`로 조회 결과를 구분한다.

| 상태값 | HTTP 상태 | 의미 |
| --- | --- | --- |
| `SUCCESS` | `200` | 조회에 성공했고 거래 내역이 있음 |
| `EMPTY` | `200` | 조회에는 성공했지만 조건에 맞는 거래가 없음 |
| `API_KEY_MISSING` | `200` | 서버에 `PUBLIC_DATA_SERVICE_KEY`가 설정되지 않음(현재 샘플 구현은 `MOCK_API_KEY_MISSING`으로 재현) |
| `API_REQUEST_FAILED` | `200` | 외부 API 요청 또는 서버의 조회 작업에 실패함 |
| `INVALID_INPUT` | `400` | 요청 파라미터 검증에 실패함 |

빈 결과와 오류 응답의 `items`는 빈 배열이다. 유효한 조회 조건이 있는 경우 `summary.count`는 `0`이다.

### 빈 결과

```json
{
  "status": "EMPTY",
  "summary": {
    "regionCode": "11680",
    "dealYmd": "202401",
    "count": 0
  },
  "items": []
}
```

### API 키 누락

```json
{
  "status": "API_KEY_MISSING",
  "summary": {
    "regionCode": "11680",
    "dealYmd": "202401",
    "count": 0
  },
  "items": []
}
```

### 잘못된 파라미터

```json
{
  "status": "INVALID_INPUT",
  "errors": [
    "지역 코드는 숫자 5자리여야 합니다.",
    "계약년월은 YYYYMM 형식이어야 합니다."
  ],
  "summary": null,
  "items": []
}
```

## 환경변수

프로젝트 루트의 `.env`에 공공데이터 인증키를 설정한다.

```dotenv
PUBLIC_DATA_SERVICE_KEY=발급받은_인증키
```

인증키를 소스 코드, 클라이언트 컴포넌트, 브라우저 로그에 기록하거나 저장소에 커밋하면 안 된다.

현재 샘플 구현은 실제 공공데이터 API를 호출하지 않으므로 인증키가 없어도 연습용 데이터를 반환한다. 다음 환경변수로 예외 상태를 재현할 수 있다.

| 환경변수 | 값 | 결과 |
| --- | --- | --- |
| `MOCK_API_KEY_MISSING` | `true` | `API_KEY_MISSING` 응답 반환 |
| `MOCK_EMPTY` | `true` | `EMPTY` 응답 반환 |
| `MOCK_API_FAILURE` | `true` | `API_REQUEST_FAILED` 응답 반환 |

## 관련 파일

- `app/api/transactions/route.js`: 요청 검증 결과를 HTTP 응답으로 변환하는 서버 라우트
- `lib/transactions.js`: 파라미터 검증, 거래 조회, 응답 데이터 구성
- `app/page.jsx`: 조회 폼과 상태 메시지, 거래 목록 표시
- `server.test.js`: 검증 규칙과 상태별 응답 테스트
