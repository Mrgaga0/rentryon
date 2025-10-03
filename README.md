# RentSmart Home

## 개발 환경
- `npm install` 후 `npm run dev`로 Express + Vite 개발 서버 실행
- `npm run build`는 클라이언트 번들과 서버 번들을 `dist/`에 생성
- 타입 검증은 `npm run check`로 실행

## Netlify 배포
- **Build command**: `npm run build`
- **Publish directory**: `dist/public`
- **Functions directory**: `netlify/functions`
- 환경 변수는 Netlify 프로젝트 > Site Configuration > Environment pages 에서 기존 `.env`와 동일하게 추가 (`DATABASE_URL`, `SESSION_SECRET`, `GEMINI_API_KEY` 등)
- 파일 업로드와 Excel 파싱이 필요하면 Netlify Functions에서 허용 용량(10MB) 내에서 작동하며, 영구 저장소가 필요할 경우 별도 스토리지(Supabase 등)를 연결해야 함

### 로컬에서 Netlify 미리보기
```bash
npm install -g netlify-cli
netlify dev
```
Netlify CLI는 `client` 정적 자산과 `/.netlify/functions/api`로 연결된 서버리스 Express를 동시에 실행합니다. 클라이언트에서 별도 설정 없이 `/api/*` 경로를 그대로 사용하면 됩니다.

## 디렉터리 구조
- `client/`: 기존 Vite + Wouter 기반 프런트엔드 (ShadCN 컴포넌트 포함)
- `server/`: Express + Drizzle API 레이어
- `shared/`: 프런트/백엔드에서 공유하는 스키마와 타입
- `netlify/functions/api.ts`: Express 앱을 Netlify Functions에서 실행하도록 래핑한 엔트리포인트
- `client/public/_redirects`: SPA 라우팅 및 `/api/*` 요청을 Functions로 프록싱하는 규칙

## 배포 체크리스트
1. `.env.example` 내용을 기준으로 Netlify 환경 변수 입력
2. Supabase/Neon DB는 `DATABASE_URL`에 SSL 옵션 포함 (`?sslmode=require`)
3. Netlify UI에서 Deploy 버튼을 눌러 빌드 → 성공 후 https://{site}.netlify.app 로 접속
4. Playwright 시나리오를 돌릴 경우 `npm run test:e2e`를 로컬에서 선행 실행
