# 7장 요청문 — 안전한 권한과 승인 모드 설정하기

이 폴더는 7장을 **끝낸 직후** 상태다. `ch06`을 복사한 뒤 아래 순서로 진행했다. 7장에서 새로
생기는 파일은 `API.md` 하나다.

## 1. read-only로 구조만 조사하기 (§7.1)

```bash
codex --sandbox read-only --ask-for-approval on-request
```

```text
/status
```

```text
아파트 실거래가 앱 구조를 먼저 조사해 줘. 파일은 수정하지 말고, 관련 파일 후보와 역할만 요약해 줘.
```

조사가 끝나면 바뀐 것이 없는지 본다. `/diff`는 마지막 커밋을 기준으로 비교하므로 ‘No changes
detected.’가 나와야 한다. 6장에서 `AGENTS.md`에 적은 한 줄을 커밋하지 않았다면 그 변경이 보인다.

```text
/diff
```

## 2. 승인 요청을 직접 확인하기 (§7.2)

```text
아파트 실거래가 자료 API를 설명하는 파일 하나를 만들어 줘.
```

읽기 전용이라 승인 창이 뜬다. 책의 실행에서는 Codex가 셸 명령(`cat > API.md`)으로 파일을 만들려
해서 명령 실행 승인 창이 떴다.

```text
Would you like to run the following command?
› 1. Yes, proceed (y)
  2. No, and tell Codex what to do differently (esc)
```

지금은 구조만 조사하는 단계이므로 2번을 고른다. Codex가 파일 수정 도구로 바로 고치려 할 때는
Would you like to make the following edits?라는 파일 수정 승인 창이 대신 뜨는데, 고르는 방법은 같다.
첫 번째 예제를 마쳤으므로 세션에서 나온다.

```text
/exit
```

## 3. workspace-write로 파일 하나 만들기 (§7.3)

```bash
codex --sandbox workspace-write --ask-for-approval on-request
```

```text
/status
```

```text
아파트 실거래가 자료 API를 설명하는 파일 하나를 만들어 줘.
```

## 4. /diff로 변경 범위 확인하기 (§7.4)

```text
/diff
```

바뀐 파일이 요청한 하나(`API.md`)뿐인지, 작업 폴더 밖 파일이나 비밀 값 파일이 섞이지 않았는지
본다. `API.md`의 내용은 실행마다 다르다. 이 폴더의 `API.md`도 책의 Diff 상자와 문장이 다르다.
`lib/transactions.js`를 키 없이도 연습용 데이터를 돌려주게 고치면서, `API.md`의 상태 표와 환경변수
표에 `MOCK_API_KEY_MISSING`을 더했다.

## 5. /permissions로 현재 권한 바꾸기 (§7.5)

세션을 끝내지 않고 권한 방식을 바꿀 때 쓴다. 선택지에는 Read Only까지 네 가지가 보인다. 바꾼 뒤에는
`/status`로 실제로 적용됐는지 본다.

```text
/permissions
```

## 6. 격리 환경에서만 고려할 --yolo (§7.7)

```bash
codex --yolo
```

책은 이 옵션을 실제로 켜지 않는다. 승인과 샌드박스를 모두 건너뛰므로, 외부에서 격리하고 복구할 수
있는 환경에서만 고려한다.
