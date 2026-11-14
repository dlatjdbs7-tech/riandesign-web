-- 고객 견적서 링크 미리보기 (카카오톡 등): "공사명 · 고객명 고객님 견적서" 제목만 돌려준다.
-- 금액·내역은 여전히 전화번호 뒤 4자리 확인 후에만 볼 수 있다. 열람 기간(3일)이 지나면 아무것도 돌려주지 않는다.
create or replace function public.shared_estimate_preview(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object('title', e.title, 'customer_name', e.customer_name)
  from estimates e
  where e.share_token = p_token
    and e.share_expires_at is not null
    and e.share_expires_at > now()
  limit 1;
$$;

grant execute on function public.shared_estimate_preview(uuid) to anon, authenticated;
