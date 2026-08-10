# 리안디자인 (REAN DESIGN) 홈페이지 + 관리자 시스템

대전 하이엔드 인테리어 리안디자인의 공식 홈페이지와 사내 관리자 시스템입니다.

- 공개 홈페이지: https://www.reandesign.co.kr
- 관리자 시스템: https://www.reandesign.co.kr/login

## 기술 스택

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- TypeScript, Tailwind CSS 4
- [Supabase](https://supabase.com) (PostgreSQL, Auth, Row Level Security)
- 배포: Vercel (GitHub `main` 브랜치 Push 시 자동 배포)

## 설치 방법

```bash
npm install
```

## 실행 방법

```bash
npm run dev      # 개발 서버 실행 (http://localhost:3000)
npm run lint      # 코드 검사
npm run build      # 프로덕션 빌드
npm run start       # 빌드 결과 실행
```

## 환경변수

`.env.local` 파일에 아래 값이 필요합니다 (`.env*`는 `.gitignore`로 저장소에 올라가지 않습니다).

```bash
NEXT_PUBLIC_SUPABASE_URL=              # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # Supabase 공개(anon) API 키
DATABASE_URL=                          # DB 마이그레이션 스크립트 실행용 (로컬 전용, 배포에는 불필요)
```

Vercel에는 `NEXT_PUBLIC_*` 두 값만 등록되어 있으면 됩니다. `DATABASE_URL`은 로컬에서 `npm run db:migrate`를
실행할 때만 쓰이는 값이라 배포 환경에는 필요 없습니다.

## 데이터베이스 마이그레이션

Supabase SQL Editor를 직접 열지 않고, 아래 명령으로 `supabase/migrations/`의 SQL을 실행합니다.

```bash
npm run db:migrate -- supabase/migrations/0001_init.sql
```

새 마이그레이션을 추가할 때는 `supabase/migrations/000N_설명.sql` 형식으로 파일을 만들고 위 명령으로 적용합니다.

## 배포 방법

Vercel과 GitHub 저장소가 연결되어 있어 `main` 브랜치에 Push하면 자동으로 Build/Lint/Type Check 후 배포됩니다.
실패하면 배포되지 않습니다.

## 프로젝트 구조

```
src/
├── app/
│   ├── (marketing)/        # 공개 홈페이지 (Header/Footer 포함, 멀티페이지)
│   │   ├── layout.tsx
│   │   ├── page.tsx          # 홈 (각 섹션 요약 + 상세 페이지 링크)
│   │   ├── about/, project/, process/, review/, contact/
│   ├── admin/               # 관리자 시스템 (로그인 + 승인된 사용자만 접근)
│   │   ├── layout.tsx        # 권한별 사이드바 메뉴
│   │   ├── attendance/        # 근태관리 (위치기반 출퇴근)
│   │   ├── employees/          # 직원 관리 (가입 승인)
│   │   ├── work-orders/         # 작업지시서
│   │   ├── work-logs/            # 업무일지
│   │   ├── work-sites/            # 근무지(사무실/현장) 관리
│   │   └── settings/               # 비밀번호 변경
│   ├── login/, signup/, pending/   # 인증 및 승인대기 화면
│   ├── auth/callback/               # Supabase 인증 콜백
│   └── layout.tsx                    # 루트 레이아웃 (폰트, SEO 메타데이터)
├── components/
│   ├── (홈페이지 섹션들: Header, Hero, About, Services, Portfolio, Contact, Footer)
│   └── admin/                # 관리자 시스템 전용 컴포넌트
├── lib/                        # 공용 타입, 인증 유틸, 거리계산(geo), 날짜포맷(KST)
└── utils/supabase/              # Supabase 클라이언트 (browser/server/middleware)

supabase/migrations/    # DB 스키마 변경 이력 (SQL)
scripts/migrate.mjs      # 마이그레이션 실행 스크립트
```

## 로그인 방식

이메일 인증 없이 **아이디(사내 전용, `아이디@reandesign.local`로 내부 변환)** 기반으로 로그인합니다.
신규 가입자는 "승인대기" 상태로 생성되며, 대표가 **직원 관리** 화면에서 승인해야 실제로 이용할 수 있습니다.

## 메뉴 접근 권한

대표는 **팀원권한** 화면에서 팀장/직원별로 어떤 메뉴가 보일지 켜고 끌 수 있습니다 (`src/lib/menu.ts`가
메뉴 목록의 기준입니다). 사이드바에서 숨기는 것뿐 아니라, 주소를 직접 입력해 들어가는 것도
`src/utils/supabase/middleware.ts`에서 막습니다 — 대표는 항상 전체 접근 가능합니다.

## 관리자 시스템 메뉴 구성

| 그룹 | 메뉴 | 상태 |
|---|---|---|
| (최상단) | 유입분석 (월별 문의 추이, 상태분포, 전환율), 리안메뉴얼 (사내 문서 CRUD) | 구현 완료 |
| PROJECTS | 캘린더 (작업지시서/AS/할일 통합 월간 뷰 + 수기 일정 등록/삭제), 시공관리 (칸반 보드 + 공정표·작업지시서·견적서·거래명세서·발주서·자주쓰는URL 바로가기 셀, 구 "현장관리") | 구현 완료 |
| PROJECTS | 현장관리 (신규/상담/견적 파이프라인 + 진행중 현장 위험도·공정률·수금률 카드 + 마감/취소·보류 목록, 현장 직접등록) | 구현 완료 |
| PROJECTS | 고객페이지 (작업지시서 기반 자동 생성 또는 수기로 직접 생성, 공개 링크로 현장사진 공유 `/project/[id]`. 입력 권한은 팀원권한의 "고객페이지" 메뉴 설정을 따름), AS관리 | 구현 완료 |
| PROJECTS | 견적서, 작업지시서, 거래명세서(파일 첨부 지원), 고객관리 — 견적서/작업지시서/거래명세서는 사이드바에서 숨기고 시공관리 셀로만 접근 (팀원권한 설정은 유지) | 기본 CRUD 구현 |
| DAILY | 할일, 알림센터 (액션 필요 항목 모음), 근태·휴무(위치기반) | 구현 완료 |
| DAILY | 업무일지 | 구현 완료 |
| LIBRARY | 자재리스트, 자주 쓰는 문구 | 기본 CRUD 구현 |
| LIBRARY | 템플릿 목록 | 준비중 |
| PEOPLE | 임직원(가입승인), 견적처, 카테고리 | 기본 CRUD 구현 |
| MARKETING | 접수관리, 포트폴리오, 사이트관리, 시공프로세스, 고객후기 (모두 홈페이지 각 페이지에 자동 반영) | 구현 완료 |
| FINANCE | 정산 | 준비중 |
| OPERATIONS | 팀원권한(역할/팀 배정 + 메뉴 접근 권한 설정), 근무지 관리 | 구현 완료 |
| OPERATIONS | 결재관리 | 준비중 |
| SETTINGS | 내정보(비밀번호 변경), 회사설정 | 구현 완료 |
| SETTINGS | 알림설정, 결제관리 | 준비중 |

"기본 CRUD"는 등록/조회/삭제 위주의 1차 버전이며, 상세 기능(라인아이템, 문서양식, 결제연동 등)은 이후 단계에서 보강 예정입니다.

## 진행 현황

- [x] Phase 1: 회사소개 홈페이지
- [x] Phase 2: 관리자 시스템 기본 골격 (회원가입/승인, 근태관리, 근무지 관리)
- [x] Phase 3: 전체 메뉴 구조 확장 (위 표 참고)
- [x] 도메인 연결 및 배포 (`reandesign.co.kr`, HTTPS 자동 적용)
- [ ] 실제 로고/시공사진 반영
- [ ] 각 모듈 상세 기능 보강 (견적서 라인아이템, 세금계산서, 정산 등)
