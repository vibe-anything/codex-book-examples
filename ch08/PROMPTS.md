```text
LAWD_CD = 11110
DEAL_YMD = 202607
serviceKey = 일반 인증키(Encoding)
```

```
cd ~/codex-book-examples

# ch05 디렉토리를 ch08로 복사
cp -R ch05 ch08
```

```
curl "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade?LAWD_CD=11110&DEAL_YMD=202607&serviceKey={SERVICE_KEY}" --user-agent 'Mozilla'
```

```
아래 주소로 curl 요청을 보내서 XML 응답이 오는지 확인해줘.
User-Agent는 Mozilla/5.0으로 설정해줘.

https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade
- serviceKey: .env의 PUBLIC_DATA_SERVICE_KEY
- LAWD_CD: 11110
- DEAL_YMD: 202607
```

```
아래 공공데이터 API 문서 페이지를 참고해 현재 프로젝트에 연동해줘.

https://www.data.go.kr/data/15126469/openapi.do

```

```
npm install

npm run dev
```