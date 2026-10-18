# 4장 요청문 (4.1) — 한 줄 요청으로 만든 앱

이 폴더는 4.1에서 한 줄 요청으로 만든 앱이다. 뒤 장으로 이어지지 않는 실험이라
5장은 이 폴더가 아니라 `real-estate-app`을 이어받는다.

## 1. 새 폴더에서 Codex 열기 (§4.1)

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force $HOME\Projects\real-estate-quick
cd $HOME\Projects\real-estate-quick
codex
```

macOS나 Linux:

```sh
mkdir -p ~/Projects/real-estate-quick
cd ~/Projects/real-estate-quick
codex
```

## 2. 한 줄로 요청하기 (§4.1)

```text
아파트 실거래가 보여 주는 앱 만들어 줘.
```

이 실행은 `app.js`, `index.html`, `package.json`, `server.js`, `style.css` 다섯 파일을 만들었다.
`index.html`을 브라우저 창에 끌어다 놓거나 더블클릭하면 열린다(`npm run dev`로 띄워도 된다).

화면의 시세는 코드에 적어 둔 강남구 여덟 단지의 예시 값이고, 검색도 그 여덟 단지 안에서만
움직인다. 실제 공공 API를 부르는 연결도, API 키를 넣을 자리도 없다.

같은 요청도 실행마다 결과가 다르다. 이 폴더는 세 번째 시도의 결과다. 앞의 두 번은
`npm run dev`로 띄우는 더 큰 앱을 만들었다.

예제 저장소에 올리면서 `server.js` 한 곳만 고쳤다. 실행이 만든 서버는 같은 네트워크의 다른
기기에서도 열리고, 주소를 조작하면 이 폴더 밖 파일까지 내주었다. 지금은 내 컴퓨터에서만 열리고
이 폴더 안 파일만 내준다.
