-- 사이트관리: 관리자에서 입력한 홈페이지 문구(히어로/소개/서비스)가 공개 홈페이지에 자동 반영되도록 함

create table site_content (
  id int primary key default 1,
  hero_tagline text,
  hero_headline text,
  hero_description text,
  about_title text,
  about_paragraph_1 text,
  about_paragraph_2 text,
  about_stat_projects text,
  about_stat_region text,
  about_stat_focus text,
  about_image_url text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into site_content (
  id, hero_tagline, hero_headline, hero_description,
  about_title, about_paragraph_1, about_paragraph_2,
  about_stat_projects, about_stat_region, about_stat_focus
)
values (
  1,
  'DAEJEON HIGH-END INTERIOR',
  '공간에 격을 더하다',
  '리안디자인은 대전을 기반으로 주거와 상업 공간에 하이엔드 디자인 철학을 담습니다. 절제된 소재와 섬세한 디테일로 오래도록 품격 있는 공간을 완성합니다.',
  '철학이 있는 공간을 만듭니다',
  '리안디자인은 대전에서 시작해 하이엔드 인테리어 시장을 지향하는 디자인 스튜디오입니다. 유행을 따르기보다 공간을 사용하는 사람의 라이프스타일과 취향을 깊이 이해하는 것에서 디자인을 시작합니다.',
  '소재 선정부터 시공, 사후관리까지 전 과정을 체계적으로 관리하여 고객이 신뢰할 수 있는 결과물을 약속합니다.',
  '진행중', '대전', '하이엔드'
);

create table services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into services (title, description, display_order) values
  ('주거공간 인테리어', '아파트, 주택, 빌라의 전체 리모델링부터 부분 시공까지 맞춤 설계합니다.', 1),
  ('상업공간 인테리어', '매장, 사무실, 카페 등 브랜드 아이덴티티를 살리는 공간을 설계합니다.', 2),
  ('디자인 컨설팅', '공간 기획 단계부터 소재·컬러 큐레이션까지 전문 컨설팅을 제공합니다.', 3),
  ('A/S 및 유지관리', '시공 이후에도 체계적인 사후관리로 오래 안심할 수 있는 공간을 만듭니다.', 4);

alter table site_content enable row level security;
alter table services enable row level security;

-- 홈페이지 방문자가 로그인 없이 볼 수 있어야 함
create policy "anyone_can_view_site_content" on site_content for select
  using (true);
create policy "update_site_content_if_owner_or_manager" on site_content for update
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

create policy "anyone_can_view_services" on services for select
  using (true);
create policy "manage_services_if_owner_or_manager" on services for all
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
