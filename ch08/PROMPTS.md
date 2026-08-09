```text
프로젝트 루트에 .env 파일을 만들고 PUBLIC_DATA_SERVICE_KEY 항목을 비워 둬.
```

```dotenv
PUBLIC_DATA_SERVICE_KEY=발급받은_키를_여기에_넣기
```

```gitignore
.env
```

```text
아래 API를 .env의 PUBLIC_DATA_SERVICE_KEY로 한 번 호출해줘.
https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade

- LAWD_CD는 11110, DEAL_YMD는 202607
- 성공 여부와 거래 건수를 알려주고, 첫 거래 한 건은 XML 태그 그대로 보여줘
- 키가 들어간 전체 URL은 화면에 출력하지 마
```

```text
방금 확인한 내용을 API.md에 반영해줘.
엔드포인트와 요청 변수, 응답 예시 한 건, 확인한 날짜를 남겨줘.
키는 넣지 마.
```

```text
아래 공공데이터 API 문서 페이지를 참고해 현재 프로젝트에 연동해줘.

https://www.data.go.kr/data/15126469/openapi.do
```

```text
/diff
```

```bash
# 의존성 설치
npm install

# 실행
npm run dev
```

```text
이 프로젝트에서 실행 중인 로컬 서버를 찾아 안전하게 종료해줘. 종료할 프로세스와 이유를 먼저 보여줘.
```

```text
API 호출이 실패해도 목록이 나온다. 샘플 데이터로 대체하는 코드가 남아 있으면 제거하고,
호출이 실패하면 화면에 오류 메시지를 보여줘.
```

```text
실거래가 목록 아이템을 클릭하면 상세 화면으로 이동하게 해줘.
상세 화면에서는 선택한 거래의 XML 응답에 포함된 모든 필드를
key-value 형태로 빠짐없이 보여줘.
```

```text
API.md에 남긴 응답 예시와
지금 상세 화면에 표시되는 키를 대조해줘.
문서에는 있는데 화면에 없는 키, 화면에는 있는데 문서에 없는 키를
각각 알려줘.
```

```text
방금 확인한 실제 응답과 AGENTS.md의 데이터 처리 규칙을 대조해줘.
실제 응답과 맞지 않는 규칙이 있으면 알려줘.
```

```text
다음 링크의 Swagger UI Model 설명을 기준으로 필드 라벨을 한글로 매핑해.
매핑한 라벨과 원본 키, 근거를 API.md에도 남겨줘.

https://www.data.go.kr/data/15126469/openapi.do#/API%20%EB%AA%A9%EB%A1%9D/getRTMSDataSvcAptTrade
```
