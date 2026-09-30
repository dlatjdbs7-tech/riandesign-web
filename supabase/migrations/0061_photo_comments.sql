-- 진행 공정 시작/종료 기간 입력은 쓰지 않기로 해서 되돌린다.
alter table work_order_photos drop column if exists period_start;
alter table work_order_photos drop column if exists period_end;
alter table customer_project_photos drop column if exists period_start;
alter table customer_project_photos drop column if exists period_end;

drop function if exists public.get_public_project_photos(uuid);
create function public.get_public_project_photos(project_id uuid)
returns table (
  id uuid,
  image_url text,
  caption text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, image_url, caption, created_at
  from work_order_photos
  where work_order_id = project_id
  order by created_at desc
$$;
grant execute on function public.get_public_project_photos(uuid) to anon, authenticated;

drop function if exists public.get_public_manual_project_photos(uuid);
create function public.get_public_manual_project_photos(project_id uuid)
returns table (
  id uuid,
  image_url text,
  caption text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, image_url, caption, created_at
  from customer_project_photos
  where customer_project_id = project_id
  order by created_at desc
$$;
grant execute on function public.get_public_manual_project_photos(uuid) to anon, authenticated;

-- 고객이 현장 사진을 보다가 궁금한 점을 남길 수 있는 사진별 문의.
create table work_order_photo_comments (
  id uuid primary key default gen_random_uuid(),
  work_order_photo_id uuid not null references work_order_photos (id) on delete cascade,
  author_name text,
  message text not null,
  created_at timestamptz not null default now()
);

create table customer_project_photo_comments (
  id uuid primary key default gen_random_uuid(),
  customer_project_photo_id uuid not null references customer_project_photos (id) on delete cascade,
  author_name text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table work_order_photo_comments enable row level security;
alter table customer_project_photo_comments enable row level security;

-- 사진 id를 정확히 아는 사람만 등록할 수 있고(추측 불가능한 링크로만 페이지 접근),
-- 목록 조회는 직원(owner/manager)만 테이블에서 직접 가능하다. 고객페이지 쪽 읽기는
-- 아래 SECURITY DEFINER 함수로 사진 id 단위로만 열어줘서, anon 키로 전체 문의를
-- 무작위로 긁어가지 못하게 막는다.
create policy "anyone_can_add_work_order_photo_comments" on work_order_photo_comments for insert
  with check (true);
create policy "select_work_order_photo_comments_if_owner_or_manager" on work_order_photo_comments for select
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
create policy "delete_work_order_photo_comments_if_owner_or_manager" on work_order_photo_comments for delete
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

create policy "anyone_can_add_customer_project_photo_comments" on customer_project_photo_comments for insert
  with check (true);
create policy "select_customer_project_photo_comments_if_owner_or_manager" on customer_project_photo_comments for select
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
create policy "delete_customer_project_photo_comments_if_owner_or_manager" on customer_project_photo_comments for delete
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

create function public.get_public_photo_comments(photo_id uuid, is_manual boolean)
returns table (
  id uuid,
  author_name text,
  message text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if is_manual then
    return query
      select c.id, c.author_name, c.message, c.created_at
      from customer_project_photo_comments c
      where c.customer_project_photo_id = photo_id
      order by c.created_at asc;
  else
    return query
      select c.id, c.author_name, c.message, c.created_at
      from work_order_photo_comments c
      where c.work_order_photo_id = photo_id
      order by c.created_at asc;
  end if;
end;
$$;
grant execute on function public.get_public_photo_comments(uuid, boolean) to anon, authenticated;
