# TODOS

## TODO-1: HF API concurrency limit
**What:** `handleGenerateAll`에 p-limit 또는 수동 캐스케이딩으로 HF API 동시 호출을 3개로 제한.
**Why:** `Promise.allSettled(scenes.map(...))` 패턴은 씬 수에 비례해 동시 요청을 보냄. HF 유료 플랜 rate limit(429) 발생 시 모든 씬이 fallback 이미지로 떨어짐.
**Pros:** AI 이미지 생성 성공률 향상, rate limit 에러 방지.
**Cons:** 총 생성 시간 증가 (병렬 → 부분 직렬화).
**Context:** `src/app/project/[id]/page.tsx:90` — `handleGenerateAll`이 `Promise.allSettled(scenes.map(...))`로 전체 병렬 실행. `p-limit` 패키지 또는 직접 구현으로 해결. 데모 3씬에선 문제없지만 씬 수 증가 시 필수.
**Depends on:** —

## TODO-2: localStorage + IndexedDB 시작 시 reconciliation
**What:** 앱 시작 시 Zustand의 blobId와 IndexedDB 실제 Blob 존재 여부를 대조 검증. 불일치 시 status를 'pending'으로 리셋.
**Why:** 탭 크래시가 IndexedDB 쓰기(2단계)와 Zustand 저장(3단계) 사이에 발생하면 dangling blobId 또는 orphan blob이 생성됨. 현재 VideoPlayer는 `imgUrl ?? null` fallback으로 자동 처리하지만, 명시적 복구 없음.
**Pros:** 불일치 상태에서 이미지 누락 없이 자동 복구.
**Cons:** 앱 로드 시 IndexedDB 쿼리 추가 (~50ms). 코드 복잡도 증가.
**Context:** `src/app/layout.tsx` 또는 `src/lib/store.ts`의 hydration 훅에서 `cleanupOldestProject()`/`getAssetBlob()` 활용. 실제 프로덕션에서는 DB transaction atomic write로 근본 해결.
**Depends on:** —

## TODO-3: README에 Web Speech API 제약 명시
**What:** README.md에 Web Speech API 한계 한 섹션 추가.
**Why:** DAG에서 Voice 노드가 'complete'로 표시되지만 실제로는 저장된 오디오 파일이 없음. 재생 시마다 live synthesis. 이 아키텍처 결정이 문서화되지 않으면 향후 기여자가 혼란을 겪음.
**Pros:** 아키텍처 의도를 명확히 전달. 향후 "왜 음성이 저장되지 않나요?" 질문 사전 차단.
**Cons:** 없음.
**Context:** Web Speech API는 AudioContext를 우회하여 직접 스피커로 출력 — MediaRecorder로 캡처 불가. 이 한계로 인해 voice blob은 항상 null로 저장됨. 플레이어는 재생 시마다 Web Speech를 직접 호출.
**Depends on:** —

## TODO-4: VideoPlayer + ReactFlow 동시 실행 시 GPU 최적화
**What:** `video-player.tsx`의 Ken Burns 이미지와 ReactFlow의 DAG 노드에 `will-change: transform` CSS 힌트 추가.
**Why:** 외부 리뷰 지적 — VideoPlayer 재생 중 파이프라인 생성이 동시에 진행되면 CSS keyframe 애니메이션과 ReactFlow SVG 업데이트가 같은 compositor 레이어에서 경쟁해 jank 유발 가능.
**Pros:** 중저사양 기기에서 애니메이션 부드러움 향상.
**Cons:** `will-change` 남용 시 오히려 메모리 증가. 실측 후 적용 권장.
**Context:** `src/app/globals.css`의 `.kenburns-*` 클래스에 `will-change: transform` 추가. `src/components/pipeline-dag.tsx`의 ReactFlow 컨테이너에 `transform: translateZ(0)` 추가. 데모 3씬/MacBook 기준으로는 체감 없을 수 있음.
**Depends on:** TODO-1 완료 후 성능 측정
