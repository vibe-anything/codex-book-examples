# 아파트 실거래가 자료 API

## 개요

이 프로젝트는 아파트 매매 실거래가를 조회하기 위한 서버 API를 제공한다. 브라우저는 공공데이터 API를 직접 호출하지 않고 Next.js 서버 라우트인 `GET /api/transactions`를 호출한다. 공공데이터 인증키는 서버 환경변수 `PUBLIC_DATA_SERVICE_KEY`에서만 읽으므로 클라이언트에 노출되지 않는다.

`lib/transactions.js`의 `fetchTransactions`가 국토교통부 아파트 매매 실거래가 API를 직접
호출한다. 호출이 실패하면 샘플 데이터로 대체하지 않고 오류 상태를 그대로 돌려준다.

## 공공데이터 실거래가 API 호출

서버는 다음 공공데이터포털 API를 호출한다. 인증키는 `.env`의 `PUBLIC_DATA_SERVICE_KEY`에서만
읽고, 키가 붙은 전체 주소는 화면과 로그에 출력하지 않는다.

```http
GET https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade
```

| 요청 변수 | 필수 여부 | 형식 | 설명 |
| --- | --- | --- | --- |
| `serviceKey` | 필수 | 문자열 | 공공데이터포털 일반 인증키. `.env`에서 읽는다 |
| `LAWD_CD` | 필수 | 숫자 5자리 | 법정동코드 10자리 중 앞 5자리. 예: 서울 종로구 `11110` |
| `DEAL_YMD` | 필수 | `YYYYMM` | 계약년월. 예: `202607` |
| `pageNo` | 선택 | 1 이상의 정수 | 조회할 페이지 번호 |
| `numOfRows` | 선택 | 1 이상의 정수 | 한 번에 조회할 행 수 |

응답은 XML이며 거래 한 건이 `<item>` 하나로 온다. 응답에 담긴 오류 코드는
`resultCode`·`returnReasonCode`로 판별하고, 인증 관련 코드는 `API_AUTH_ERROR`로 구분한다.

문서 출처: <https://www.data.go.kr/data/15126469/openapi.do>

## 응답 필드와 한글 라벨 매핑

상세 화면의 한글 라벨은 앞 문서 페이지의 Swagger UI Model 설명을 근거로 정했다. 원본 키는
`items[].rawFields`에 그대로 보존하므로, 새 필드가 응답에 추가돼도 원본을 잃지 않는다.

| 원본 키 | 한글 라벨 |
| --- | --- |
| `sggCd` | 지역코드 |
| `umdNm` | 법정동 |
| `aptNm` | 단지명 |
| `jibun` | 지번 |
| `excluUseAr` | 전용면적 |
| `dealYear` | 계약년도 |
| `dealMonth` | 계약월 |
| `dealDay` | 계약일 |
| `dealAmount` | 거래금액(만원) |
| `floor` | 층 |
| `buildYear` | 건축년도 |
| `rawFields` | 응답 `<item>`의 모든 태그를 `{ key, label, value }`로 보존한 목록. 상세 화면이 사용 |
| `cdealType` | 해제여부 |
| `cdealDay` | 해제사유발생일 |
| `dealingGbn` | 거래유형(중개 및 직거래 여부) |
| `estateAgentSggNm` | 중개사소재지(시군구 단위) |
| `rgstDate` | 등기일자 |
| `aptDong` | 아파트 동명 |
| `slerGbn` | 거래주체정보_매도자(개인/법인/공공기관/기타) |
| `buyerGbn` | 거래주체정보_매수자(개인/법인/공공기관/기타) |
| `landLeaseholdGbn` | 토지임대부 아파트 여부 |

근거: <https://www.data.go.kr/data/15126469/openapi.do#/API%20%EB%AA%A9%EB%A1%9D/getRTMSDataSvcAptTrade>
의 Swagger UI Models(`body` → `items` → `item`).

## 요청

```http
GET /api/transactions?regionName=서울특별시%20강남구&dealYmd=202401&pageNo=1
```

| 파라미터 | 필수 여부 | 형식 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `regionName` | 선택 | 문자열 | `서울특별시 강남구` | 지역명. `legalDongCode.txt`에서 법정동코드를 찾아 앞 5자리를 `LAWD_CD`로 쓴다 |

지역명이 여러 지역과 일치하거나(`중구` 등) 찾을 수 없으면 외부 API를 호출하지 않고
`INVALID_INPUT`으로 후보를 함께 알려 준다. 응답의 `summary`에는 입력한 `regionName`과
찾아낸 `regionCode`가 함께 담긴다.

| `dealYmd` | 필수 | `YYYYMM` | 없음 | 계약년월. 예: `202401` |
| `pageNo` | 선택 | 1 이상의 정수 | `1` | 조회할 페이지 번호 |
| `numOfRows` | 선택 | `10` | `10` | 한 페이지 행 수. 목록이 이전·다음 버튼으로 넘어가므로 10으로 고정한다 |

형식에 맞지 않는 값이 하나라도 있으면 외부 API를 호출하지 않고 `400 Bad Request`를 반환한다.

## 성공 응답

```json
{
  "status": "SUCCESS",
  "summary": {
    "regionCode": "11680",
    "regionName": "서울특별시 강남구",
    "dealYmd": "202401",
    "count": 24,
    "pageNo": 1,
    "numOfRows": 10,
    "totalPages": 3
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
| `rawFields` | 응답 `<item>`의 모든 태그를 `{ key, label, value }`로 보존한 목록. 상세 화면이 사용 |

응답의 `dealAmount`에는 공백과 쉼표가 섞여 온다. 쉼표와 공백을 제거해 만 원 단위 숫자로 파싱하고, 화면에서는 억/만 원 단위로 읽기 좋게 표시한다.

## 상태값과 오류 응답

응답 본문의 `status`로 조회 결과를 구분한다.

| 상태값 | HTTP 상태 | 의미 |
| --- | --- | --- |
| `SUCCESS` | `200` | 조회에 성공했고 거래 내역이 있음 |
| `EMPTY` | `200` | 조회에는 성공했지만 조건에 맞는 거래가 없음 |
| `API_KEY_MISSING` | `200` | 서버에 `PUBLIC_DATA_SERVICE_KEY`가 설정되지 않음 |
| `API_AUTH_ERROR` | `200` | 인증키가 없거나 잘못돼 외부 API가 인증 오류를 돌려줌 |
| `API_REQUEST_FAILED` | `200` | 외부 API 요청 또는 서버의 조회 작업에 실패함 |
| `INVALID_INPUT` | `400` | 요청 파라미터 검증에 실패함 |

빈 결과와 오류 응답의 `items`는 빈 배열이다. 유효한 조회 조건이 있는 경우 `summary.count`는 `0`이고 `summary.totalPages`는 `1`이다.
`summary.count`는 응답의 `totalCount`, 즉 조건에 맞는 전체 거래 건수다.

### 빈 결과

```json
{
  "status": "EMPTY",
  "summary": {
    "regionCode": "11680",
    "regionName": "서울특별시 강남구",
    "dealYmd": "202401",
    "count": 0,
    "pageNo": 1,
    "numOfRows": 10,
    "totalPages": 1
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
    "regionName": "서울특별시 강남구",
    "dealYmd": "202401",
    "count": 0,
    "pageNo": 1,
    "numOfRows": 10,
    "totalPages": 1
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

## 지역명 자동완성 API

지역명 입력란의 후보 목록은 별도 서버 라우트에서 받는다.

```http
GET /api/regions?query=강남
```

| 파라미터 | 필수 여부 | 형식 | 설명 |
| --- | --- | --- | --- |
| `query` | 선택 | 40자 이하 문자열 | 지역명 일부. 비어 있으면 빈 목록을 돌려준다 |

40자를 넘기면 `400 Bad Request`와 함께 `INVALID_INPUT`을 돌려준다. 후보 검색 로직은
`lib/region-codes.js`의 `findRegionSuggestions`에 있다.

## 환경변수

프로젝트 루트의 `.env`에 공공데이터 인증키를 설정한다.

```dotenv
PUBLIC_DATA_SERVICE_KEY=발급받은_인증키
```

인증키를 소스 코드, 클라이언트 컴포넌트, 브라우저 로그에 기록하거나 저장소에 커밋하면 안 된다.

키를 일부러 틀리게 바꾸면 화면에 오류가 뜨는지로 실제 호출 여부를 확인할 수 있다.

## 관련 파일

- `app/api/transactions/route.js`: 요청 검증 결과를 HTTP 응답으로 변환하는 서버 라우트
- `app/api/regions/route.js`: 지역명 후보를 돌려주는 자동완성 서버 라우트
- `lib/region-codes.js`: `legalDongCode.txt`를 읽어 지역명을 법정동코드로 바꾸고 후보를 찾는 모듈
- `app/components/region-autocomplete.jsx`: 지역명 입력과 후보 목록 화면
- `lib/transactions.js`: 파라미터 검증, 거래 조회, 응답 데이터 구성
- `app/page.jsx`: 조회 폼과 상태 메시지, 거래 목록 표시
- `server.test.js`: 검증 규칙과 상태별 응답 테스트
