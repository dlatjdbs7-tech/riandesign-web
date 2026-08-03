-- 홈페이지 멀티페이지 확장: 실제 시공 프로젝트/시공 프로세스/고객후기를 관리자에서 등록하면
-- 공개 홈페이지에 자동 반영되도록 함 (site_content/portfolio_items와 동일한 패턴)

alter table portfolio_items add column size_py text;

alter table company_settings
  add column blog_url text,
  add column instagram_url text,
  add column youtube_url text;

update company_settings set
  address = '대전광역시 서구 도안중로305번안길 7-17, 1층',
  blog_url = 'https://blog.naver.com/reandesign_',
  instagram_url = 'https://www.instagram.com/rean.interior',
  youtube_url = 'https://www.youtube.com/@rean.interior'
where id = 1;

alter table site_content
  add column about_naming_story text,
  add column process_intro text,
  add column contact_notice text;

update site_content set
  about_naming_story = '리안(RE-AN)은 공간을 다시 분석하고(RE-analyze) 새롭게 디자인한다(RE-design)는 의미를 담고 있습니다.',
  process_intro = '고객과 함께 하는 공간, 투명한 절차로 진행됩니다.',
  contact_notice = '상담은 예약제로 운영되고 있어 사전 예약 후 방문 부탁드립니다.'
where id = 1;

create table process_steps (
  id uuid primary key default gen_random_uuid(),
  step_number int not null,
  title text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  project_label text,
  rating int not null default 5 check (rating between 1 and 5),
  content text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table process_steps enable row level security;
alter table reviews enable row level security;

create policy "anyone_can_view_process_steps" on process_steps for select
  using (true);
create policy "manage_process_steps_if_owner_or_manager" on process_steps for all
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

create policy "anyone_can_view_reviews" on reviews for select
  using (true);
create policy "manage_reviews_if_owner_or_manager" on reviews for all
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

insert into portfolio_items (title, size_py, display_order) values
  ('세종 나릿재3단지 제일풍경채 위너스카이', '39PY', 1),
  ('대전 봉명 호반베르디움2단지 [탑층세대]', '34PY', 2),
  ('대전 둔산동 햇님아파트', '57PY', 3),
  ('대전 봉명 호반베르디움2단지', '34PY', 4),
  ('대전 도안동 한라비발디', '33PY', 5),
  ('대전 도안동 도안리슈빌', '34PY', 6),
  ('대전 문화동 센트럴파크2단지', '39PY', 7),
  ('대전 둔산동 햇님아파트', '57PY', 8),
  ('대전 둔산동 국화아파트', '30PY', 9),
  ('대전 상대동 한라비발디', '40PY', 10),
  ('대전 도안동 도안리슈빌', '34PY', 11),
  ('대전 용산동 푸르지오하임 1단지', '58PY', 12),
  ('대전 둔산동 가람아파트', '44PY', 13),
  ('충청남도 홍성군 단독주택', '45PY', 14),
  ('세종 나릿재3단지 제일풍경채 위너스카이', '39PY', 15),
  ('대전 문지동 효성 해링턴', '34PY', 16);

insert into process_steps (step_number, title, description, display_order) values
  (1, '상담 문의', '홈페이지 상담 신청을 작성해 주시면 내용확인 후 순차적으로 연락드립니다.', 1),
  (2, '초도 상담', '예약된 일정에 맞춰 방문해 주시면 대표와 직접 상담을 진행합니다. 고객의 요구사항, 예산, 공사 범위를 논의합니다.', 2),
  (3, '제안서 미팅', '초도 상담 내용을 바탕으로 레이아웃 및 공간 제안서를 준비하여 미팅합니다. 견적 검토 후 계약이 진행됩니다.', 3),
  (4, '현장 실측', '계약 후 대표와 담당 디자이너가 현장을 방문하여 실측과 현장 상태를 확인합니다.', 4),
  (5, '디자인 미팅 및 자재 선정', '실측 내용을 바탕으로 레이아웃, 디자인 디테일을 세밀하게 협의합니다. 최종 안이 확정되면 자재를 선택합니다.', 5),
  (6, '공사 시작', '대표의 직접 관리 아래, 함께 호흡을 맞춰온 전문 기술 인력분들과 공사를 진행합니다.', 6),
  (7, '공사 완료 및 촬영', '마감 상태를 확인하고 공간 기록용 사진촬영을 진행합니다.', 7),
  (8, '사후 관리', '사후관리 기간은 1년입니다. 문제 발생 시 책임 있게 처리합니다.', 8);
