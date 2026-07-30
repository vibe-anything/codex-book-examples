```text
LAWD_CD = 11110
DEAL_YMD = 202607
serviceKey = 일반 인증키(Encoding)
```

```dotenv
PUBLIC_DATA_SERVICE_KEY=발급받은_키를_여기에_넣기
```

```gitignore
.env
```

```bash
curl "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade?LAWD_CD=11110&DEAL_YMD=202607&serviceKey={SERVICE_KEY}" --user-agent "Mozilla/5.0"
```

```text
아래 주소로 curl 요청을 보내서 XML 응답이 오는지 확인해줘.
User-Agent는 Mozilla/5.0으로 설정해줘.

https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade
- serviceKey: .env의 PUBLIC_DATA_SERVICE_KEY
- LAWD_CD: 11110
- DEAL_YMD: 202607
```

```text
아래 공공데이터 API 문서 페이지를 참고해 현재 프로젝트에 연동해줘.

https://www.data.go.kr/data/15126469/openapi.do
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
