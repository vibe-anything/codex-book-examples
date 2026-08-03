# 17장 요청문 — 맞춤형 확장 Skill 개발하기

이 폴더는 17장을 **끝낸 직후** 상태다. `ch16`(배포 완료 상태)을 복사한 뒤 아래 순서로 만들었다.

## 1. `$skill-creator`로 검증 Skill 만들기 (§17.3)

```text
$skill-creator

이 프로젝트를 공유하기 전에 배포 상태를 최종 검증하는 Skill을 만들어줘.
이름은 verify-market-dashboard이야. 이 저장소에서만 쓰는 Skill로,
저장소 루트의 .agents/skills/verify-market-dashboard/에 저장해줘.
그 경로에 쓸 수 없으면 다른 위치로 우회하거나 AGENTS.md를 고치지 말고,
쓰기 승인을 요청하거나 멈춰서 알려줘.
SKILL.md와 보고서는 한국어로 작성해줘.

다음 순서로 읽기 전용 검증을 수행해야 해.
1. Vercel 최신 프로덕션 배포가 Ready이고, 공유하려는 커밋과 같은지
2. 배포된 주소를 직접 열어 데이터 출처·기준일 표시와 실제 시세 조회 확인
3. 최근 런타임 로그에 반복되는 5xx 오류가 없는지
4. 코드가 참조하는 환경변수 이름이 저장소의 계약(.env.sample과 앱별 기준 문서)과
   일치하는지 (값 조회 금지, 계약에 없는 이름을 코드가 요구하면 실패)
5. Git 추적 파일과 커밋 이력에 .env나 비밀값이 없는지

Vercel 조회(배포 상태·주소·로그·배포 화면)는 이미 연결된 Vercel MCP만 사용해.
다른 도구를 설치하거나 로그인해서 보완하지 말고, 확인하지 못한 항목은 PASS로
만들지 말고 WARNING으로 남기면서 사람이 할 확인을 안내해줘.

판정은 PASS, WARNING, BLOCKED 세 가지야. 보고는 매번 같은 형식으로 해줘.
전체 판정 한 줄 아래 다섯 행 표(영역 | 상태 | 확인한 근거 | 다음 행동)를 두고,
행 이름은 배포 상태, 배포 화면·API, 런타임 로그, 환경변수 계약, Git 비밀 검사로 고정해줘.
자동 수정, 배포·재배포, 환경변수 값 조회·변경은 금지해줘.
앱별 완료 기준은 references 파일로 분리해줘.
```

이 실행은 `SKILL.md` · `references/korea-market-dashboard.md` ·
`scripts/scan_git_secrets.py` · `agents/openai.yaml` 네 파일을 만들었다(20분 2초).

## 2. SKILL.md 검토 (§17.3)

`@`로 `SKILL.md`를 붙이고:

```text
이 SKILL.md를 검토해줘.
- 언제 사용하고 언제 사용하지 않는지가 description에 분명한지
- 배포 상태·배포 화면·로그·환경변수·Git 비밀 검사 다섯 가지가 순서대로 있는지
- 보고서의 다섯 행 표 형식과 행 이름이 파일에 고정돼 있는지
- 비밀값 조회나 자동 수정 같은 위험한 동작이 없는지
- 확인하지 못한 항목을 PASS로 처리하지 않는지
문제가 있으면 파일을 고치지 말고 위치와 이유만 알려줘.
```

→ 이 실행에서도 **`description`에 "사용하지 않을 때"가 없다는 지적 1건**만 돌아왔다.
보정 요청 후 커밋·푸시한다(`052cc3a 검증 Skill 추가`).

## 3. Skill 호출 (§17.4)

```text
$verify-market-dashboard
현재 주식 대시보드를 다른 사람에게 공유해도 되는지 최종 검증해줘.
파일과 외부 설정은 바꾸지 말고 결과만 보고해줘.
```

## 4. 오타 실험 (§17.5)

```text
서버 코드 아무 파일에 다음 한 줄만 추가하고 커밋해줘. 다른 코드는 건드리지 마.

const supabasePublishableKeyPreview = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEI;
```

다시 Skill을 호출하면 **환경변수 계약이 BLOCKED**로 바뀌고 `_KEI` 오타 진단이 붙는다.
확인 후 되돌린다:

```text
확인했어. 방금 심은 실험 커밋을 git revert로 되돌려줘.
```
