• Proposed Plan


  # 아파트 실거래가 조회 웹앱

  ## Summary

  - 빈 작업공간에 React + Vite 프론트엔드와 Node/Express 백엔드를 함께 구성한
    다.

  - v1 범위는 아파트 매매 실거래가 조회로 제한한다.
  - 데이터는 공공데이터포털 국토교통부 실거래가 API를 사용하고, API 키는 서버
    환경변수로만 보관한다.

  ## Key Changes

  - 서버:
      - GET /api/apt-trades?lawdCd=11110&dealYm=202606 형태의 내부 API를 만든
        다.

      - 서버가 공공 API에 serviceKey, LAWD_CD, DEAL_YMD를 전달해 조회한다.
      - XML 응답이면 서버에서 JSON으로 변환하고, 프론트엔드에는 정규화된 배열
        만 반환한다.

      - API 키 누락, 외부 API 실패, 결과 없음, 잘못된 날짜/지역 코드를 명확한
        에러 응답으로 처리한다.

  - 프론트엔드:
      - 시도/시군구 선택, 거래월 선택, 단지명 검색 필터를 제공한다.
      - 결과는 단지명, 거래일, 거래금액, 전용면적, 층, 건축년도, 법정동을 표
        형태로 보여준다.

      - 로딩, 빈 결과, 오류 상태를 별도 UI로 표시한다.
      - 모바일에서도 검색 영역과 결과 테이블이 깨지지 않도록 반응형으로 구성한
        다.

  - 설정:
      - .env.example에 MOLIT_SERVICE_KEY와 공공 API 기본 URL을 문서화한다.
      - 실제 .env는 커밋하지 않는 전제로 둔다.
      - 시군구 선택용 최소 지역 코드 데이터는 앱 내부 JSON으로 포함한다.

  ## Public Interfaces

  - Environment:
      - MOLIT_SERVICE_KEY: 공공데이터포털 인증키
      - MOLIT_APT_TRADE_API_URL: 기본값은 국토교통부 아파트 매매 실거래가 API
        URL

  - Internal API:
      - GET /api/apt-trades
      - Query params:
          - lawdCd: 필수, 법정동코드 앞 5자리
          - dealYm: 필수, YYYYMM

      - Response:
          - { items: AptTrade[], count: number }

      - AptTrade fields:
          - apartmentName, legalDong, dealYear, dealMonth, dealDay, price,
            area, floor, builtYear, raw

  ## Test Plan

  - 서버 단위 테스트:
      - 필수 쿼리 누락 시 400
      - API 키 누락 시 500 또는 설정 오류 응답
      - 공공 API XML 응답을 정상 JSON 배열로 변환
      - 결과 없음 응답을 빈 배열로 처리

  - 프론트엔드 확인:
      - 지역과 월 선택 후 조회 요청이 올바른 쿼리로 발생
      - 단지명 필터가 클라이언트에서 즉시 적용
      - 로딩, 오류, 빈 결과 UI 확인

  - 실행 검증:
      - npm install
      - npm run dev
      - npm test 또는 제공되는 테스트 스크립트 실행

  ## Assumptions

  - 첫 버전은 아파트 매매만 지원하고 전월세, 오피스텔, 연립다세대, 단독다가구
    는 제외한다.

  - 사용자는 공공데이터포털에서 발급받은 서비스키를 .env에 넣어 실행한다.
  - 배포보다는 로컬 실행 가능한 앱 완성을 우선한다.
  - 지역 선택 데이터는 전국 전체를 넣되, 법정동 전체 주소 검색은 v1에서 제외한
    다.
