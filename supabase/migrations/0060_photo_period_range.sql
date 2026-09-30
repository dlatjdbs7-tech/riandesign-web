-- 현장 사진을 올릴 때 "며칠부터 며칠까지 진행한 공정"인지 기간을 같이 남길 수 있게 한다.
alter table work_order_photos add column if not exists period_start date;
alter table work_order_photos add column if not exists period_end date;
alter table customer_project_photos add column if not exists period_start date;
alter table customer_project_photos add column if not exists period_end date;

-- 공개 고객페이지가 새 컬럼을 볼 수 있도록 RPC 반환 타입을 갱신한다.
-- returns table 시그니처가 바뀌므로 create or replace로는 안 되고 drop 후 재생성해야 한다.
drop function if exists public.get_public_project_photos(uuid);
create function public.get_public_project_photos(project_id uuid)
returns table (
  id uuid,
  image_url text,
  caption text,
  period_start date,
  period_end date,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, image_url, caption, period_start, period_end, created_at
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
  period_start date,
  period_end date,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, image_url, caption, period_start, period_end, created_at
  from customer_project_photos
  where customer_project_id = project_id
  order by created_at desc
$$;
grant execute on function public.get_public_manual_project_photos(uuid) to anon, authenticated;
