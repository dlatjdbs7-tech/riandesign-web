# 리안디자인 (RIAN DESIGN) 홈페이지

대전 하이엔드 인테리어 리안디자인의 공식 홈페이지입니다.

## 기술 스택

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- TypeScript
- Tailwind CSS 4
- 배포: Vercel (예정)

## 설치 방법

```bash
npm install
```

## 실행 방법

```bash
# 개발 서버 실행
npm run dev

# 코드 검사
npm run lint

# 프로덕션 빌드
npm run build

# 빌드 결과 실행
npm run start
```

개발 서버 실행 후 [http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

## 환경변수

현재는 별도 환경변수가 필요하지 않습니다. Phase 2(관리자 시스템)에서 데이터베이스/인증 연동이 추가되면
`.env.local` 파일에 아래와 같은 값이 추가될 예정입니다. (`.env*` 파일은 `.gitignore`에 의해 저장소에 올라가지 않습니다)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 배포 방법

Vercel과 GitHub 저장소를 연결하면, `main` 브랜치에 Push할 때마다 자동으로 빌드·배포됩니다.
배포 전 Build / Lint / Type Check가 통과해야 합니다.

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx      # 공통 레이아웃 (Header/Footer, 폰트, SEO 메타데이터)
│   ├── page.tsx         # 홈페이지 (섹션 조립)
│   └── globals.css      # 전역 스타일, 색상 토큰
└── components/
    ├── Header.tsx        # 상단 내비게이션
    ├── Hero.tsx           # 첫 화면
    ├── About.tsx          # 회사소개
    ├── Services.tsx       # 서비스 안내
    ├── Portfolio.tsx      # 시공 사례
    ├── Contact.tsx        # 상담 신청 폼
    ├── Footer.tsx         # 하단 회사정보
    └── PlaceholderBlock.tsx  # 실제 사진 준비 전 임시 이미지 블록
```

## 진행 현황

- [x] Phase 1: 회사소개 홈페이지 (현재 임시 이미지 사용 중, 실제 시공사진 교체 예정)
- [ ] Phase 2: 관리자 시스템 (임직원 관리, 근태관리)
- [ ] 도메인 연결 및 배포
