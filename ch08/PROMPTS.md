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
아래 공공데이터 API를 현재 프로젝트에 연동해줘.

https://www.data.go.kr/data/15126469/openapi.do

```

```
npm install

npm run dev
```