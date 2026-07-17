# 부동산 실거래가 조회 API

이 문서는 이 프로젝트가 제공하는 아파트 매매 실거래가 조회 API의 사용 방법을 설명한다. 클라이언트는 공공데이터 API를 직접 호출하지 않고, Next.js 서버 라우트인 `/api/transactions`를 통해 거래 자료를 조회한다. 따라서 공공데이터 API 키가 브라우저에 노출되지 않는다.

> 현재 `lib/transactions.js`는 실제 공공데이터 API 호출 대신 샘플 거래 자료를 반환한다. 실제 연동을 추가하더라도 이 문서의 요청·응답 형식과 상태값은 유지하는 것을 원칙으로 한다.

## 요청

```http
GET /api/transactions?regionCode=11680&dealYmd=202401&pageNo=1&numOfRows=10
```

| 파라미터 | 필수 여부 | 형식 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `regionCode` | 선택 | 숫자 5자리 | `11680` | 법정동 시군구 코드 |
| `dealYmd` | 필수 | `YYYYMM` | 없음 | 조회할 계약년월 |
| `pageNo` | 선택 | 1 이상의 정수 | `1` | 조회할 페이지 번호 |
| `numOfRows` | 선택 | 1 이상의 정수 | `10` | 한 번에 조회할 거래 건수 |

입력값이 형식에 맞지 않으면 외부 API 작업 전에 요청을 거부한다.

## 성공 응답

유효한 요청은 다음과 같은 JSON을 반환한다.

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

`summary.count`는 응답에 포함된 거래 건수이며, `items`의 각 항목은 다음 필드를 가진다.

| 필드 | 설명 |
| --- | --- |
| `apartmentName` | 아파트 단지명 |
| `legalDong` | 법정동 이름 |
| `dealAmount` | 거래금액. 원천 자료에서는 만원 단위로 다루며, 화면에서는 억/만 원 단위로 읽기 좋게 표시한다. |
| `exclusiveArea` | 전용면적(㎡) |
| `floor` | 거래 층 |
| `dealDate` | 계약일(`YYYY-MM-DD`) |
| `buildYear` | 건축년도 |

실제 공공데이터 응답을 연결할 때 거래금액은 쉼표와 공백을 제거한 뒤 **만원 단위 숫자**로 파싱하여 내부에서 다룬다.

## 상태값

응답 본문의 `status`로 조회 결과를 명확하게 구분한다.

| 상태값 | 의미 | HTTP 상태 |
| --- | --- | --- |
| `SUCCESS` | 조회에 성공했고 거래 내역이 있음 | `200` |
| `EMPTY` | 조회에는 성공했지만 조건에 맞는 거래가 없음 | `200` |
| `INVALID_INPUT` | 지역 코드, 계약년월, 페이지 또는 행 수가 잘못됨 | `400` |
| `API_KEY_MISSING` | 서버에 공공데이터 API 키가 설정되지 않음 | `200` |
| `API_REQUEST_FAILED` | 상위 API 요청, 인증 또는 처리 과정에서 실패함 | `200` |

파라미터 오류 응답에는 `errors` 배열이 포함된다.

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

빈 결과와 실패 결과는 모두 `items`가 빈 배열이지만, 각각 `EMPTY`와 `API_REQUEST_FAILED`라는 서로 다른 상태값을 사용한다. 화면과 테스트에서는 배열 길이만 보지 말고 이 상태값으로 결과를 판별해야 한다.

## API 키 설정

프로젝트 루트의 `.env`에 서버 환경변수를 설정한다.

```dotenv
PUBLIC_DATA_API_KEY=발급받은_API_키
```

API 키는 서버의 `fetchTransactions`에서만 읽는다. `NEXT_PUBLIC_` 접두사를 붙이거나 클라이언트 코드에 키를 작성하면 브라우저에 노출될 수 있으므로 사용하지 않는다. 실제 키가 포함된 `.env` 파일이나 키 값이 출력된 로그도 저장소에 커밋하지 않는다.

## 호출 예시

브라우저 또는 같은 애플리케이션의 클라이언트 코드에서 다음과 같이 호출할 수 있다.

```js
const params = new URLSearchParams({
  regionCode: '11680',
  dealYmd: '202401',
  pageNo: '1',
  numOfRows: '10'
});

const response = await fetch(`/api/transactions?${params}`);
const result = await response.json();

if (result.status === 'SUCCESS') {
  console.log(result.items);
} else if (result.status === 'EMPTY') {
  console.log('해당 조건의 거래 내역이 없습니다.');
} else {
  console.error(result.status, result.errors ?? []);
}
```

모든 응답에는 `cache-control: no-store` 헤더를 사용하여 조회 결과가 캐시되지 않게 한다.
