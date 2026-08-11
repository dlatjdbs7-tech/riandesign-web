-- 채팅방 우클릭 관리 기능: 이름변경/드래그 순서이동, 메시지 개별 삭제

alter table chat_conversation_members add column if not exists sort_order integer not null default 0;

-- 본인이 보낸 메시지만 삭제 가능
create policy "delete_own_message" on chat_messages for delete
  using (sender_id = auth.uid());

-- 방 이름 변경 (참여 중인 단체방만)
create or replace function public.rename_chat_room(room_id uuid, new_name text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if current_user_status() <> 'approved' then
    raise exception '승인된 사용자만 이름을 바꿀 수 있습니다';
  end if;
  if trim(new_name) = '' then
    raise exception '방 이름을 입력해주세요';
  end if;
  if not exists (
    select 1 from chat_conversation_members
    where conversation_id = room_id and user_id = auth.uid()
  ) then
    raise exception '참여 중인 방만 이름을 바꿀 수 있습니다';
  end if;

  update chat_conversations set name = trim(new_name) where id = room_id and type = 'group';
end;
$$;

grant execute on function public.rename_chat_room(uuid, text) to authenticated;

-- list_group_rooms에 개인별 순서 정보 포함
drop function if exists public.list_group_rooms();

create function public.list_group_rooms()
returns table(
  conversation_id uuid,
  name text,
  created_by uuid,
  is_member boolean,
  sort_order integer,
  last_message text,
  last_message_at timestamptz
)
language plpgsql security definer set search_path = public stable
as $$
begin
  return query
  select
    c.id,
    coalesce(c.name, '이름없는 방'),
    c.created_by,
    my_member.user_id is not null,
    coalesce(my_member.sort_order, 0),
    lm.content,
    lm.created_at
  from chat_conversations c
  left join chat_conversation_members my_member
    on my_member.conversation_id = c.id and my_member.user_id = auth.uid()
  left join lateral (
    select m.content, m.created_at
    from chat_messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where c.type = 'group'
  order by coalesce(lm.created_at, c.created_at) desc;
end;
$$;

grant execute on function public.list_group_rooms() to authenticated;
