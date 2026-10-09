# specsheet

IT 뉴스 다이제스트와 벤더 문서(데이터시트) 아카이브를 Cloudflare Worker `specsheet` 하나가 제공하고,
운영 데이터는 D1 `specsheet`에 저장합니다. 2026-10에 [devlog](https://github.com/tkddls8848/devlog)
저장소에서 분리한 독립 서비스입니다.
매일 생성되는 결과는 GitHub에 커밋하지 않습니다.

| 폴더 | 주소 | 하는 일 |
| --- | --- | --- |
| [`news/`](news/) | <https://specsheet.tkddls8848.workers.dev/> | IT 뉴스·블로그를 읽고 2~3분 분량의 줄글과 출처 링크로 발행하는 뉴스 다이제스트. **Worker 코드 전체가 이 폴더에 있습니다.** |
| [`archive/`](archive/) | <https://specsheet.tkddls8848.workers.dev/archive/> | IBM·Lenovo·HPE·Dell·NetApp·Oracle 제품 문서 갱신을 목록으로 축적 |
| [`shared/`](shared/) | | 벤더 수집기(`vendor-*.mjs`), 공통 테마, 환경 파일 도구 |

`archive/` 폴더에는 GitHub Pages 시절의 Eleventy 사이트와 수집기 테스트가 남아 있지만 운영 원본은
아닙니다. 운영 코드는 `news/worker/`에, 공통 코드는 `shared/`에 있습니다.

## 매일 돌아가는 일

| 시각(KST) | 실행 | 내용 |
| --- | --- | --- |
| 07:00 | Worker Cron `0 22 * * *` | 뉴스 수집 → 기사 발췌 읽기 → Workers AI(`gpt-oss-20b`)가 줄글 작성 → 발행 |
| 09:25 | Worker Cron `25 0 * * *` | 벤더 문서 수집 → D1 저장 (HPE는 Cloudflare에서 막혀 실패로 남음) |
| 09:30 | GitHub Actions `hpe-archive.yml` | HPE 문서를 GitHub 러너에서 수집해 D1 API로 저장 |

## GitHub Actions

```text
.github/workflows/test.yml           두 폴더의 테스트를 매트릭스로 각각 실행 (main 푸시, PR)
.github/workflows/hpe-archive.yml    매일 HPE 문서 수집 → D1 (news/tools/push-vendor-docs.mjs)
```

배포는 GitHub Actions가 아니라 Cloudflare Workers Builds가 `main` 푸시마다 합니다. D1
마이그레이션은 자동으로 적용되지 않습니다. 설정은 [`news/README.md`](news/README.md)를 보세요.

테스트는 네트워크와 비밀값 없이 돕니다.

## 비밀값과 설정

| 어디에 | 이름 | 쓰임 |
| --- | --- | --- |
| GitHub Actions secret | `CLOUDFLARE_API_TOKEN`(D1 편집), `CLOUDFLARE_ACCOUNT_ID` | HPE 수집 워크플로의 D1 쓰기 |
| `news/wrangler.jsonc` vars | `CF_AI_MODEL` 등 | 뉴스 다이제스트 모델과 수집 설정 |
| 저장소 최상위 `.env` | 로컬 도구 설정 | 로컬 실행 |

Workers AI와 D1은 Worker binding이라 Worker 쪽에는 Cloudflare API 토큰이 필요 없습니다.

로컬 환경변수 파일은 **저장소 최상위 `.env` 하나만** 씁니다. 처음에 `.env.example`을 `.env`로
복사하고, 하위 폴더에는 `.env`나 `.dev.vars`를 만들지 않습니다. Node 도구는 실행 위치와 관계없이
`shared/env.mjs`로 같은 파일을 읽고, 셸·CI 환경변수가 파일 값보다 우선합니다.

## 로컬 실행

저장소 루트에는 `package.json`이 없습니다. 작업할 폴더에서 실행합니다.

```bash
cd news && npm install && npm run dev      # 운영 Worker(뉴스·아카이브)
cd archive && npm install && npm test      # 수집기 파싱 테스트
```

자세한 내용은 각 폴더의 README를 보세요.
